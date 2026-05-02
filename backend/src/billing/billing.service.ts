import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Consultation } from '../database/entities/consultation.entity';
import { User } from '../database/entities/user.entity';
import { Consultant } from '../database/entities/consultant.entity';
import { Credit } from '../database/entities/credit.entity';
import { ConsultantEarning } from '../database/entities/consultant-earning.entity';

export interface BillingTickResult {
  consultationId: string;
  minutesElapsed: number;
  minutesCharged: number;
  creditsRemaining: number;
  costSoFar: number;
  pricePerMinute: number;
  outOfCredits: boolean;
}

@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);

  constructor(
    @InjectRepository(Consultation)
    private consultationsRepo: Repository<Consultation>,
    @InjectRepository(User)
    private usersRepo: Repository<User>,
    @InjectRepository(Consultant)
    private consultantsRepo: Repository<Consultant>,
    @InjectRepository(Credit)
    private creditsRepo: Repository<Credit>,
    @InjectRepository(ConsultantEarning)
    private earningsRepo: Repository<ConsultantEarning>,
  ) {}

  /**
   * Idempotent per-minute charge.
   * Charges only the delta between the consultation's already-billed minutes
   * and the requested target. Caps at the user's available credits and
   * signals out-of-credits when funds are exhausted.
   */
  async chargeForMinutes(
    consultationId: string,
    targetElapsedMinutes: number,
  ): Promise<BillingTickResult | null> {
    return this.consultationsRepo.manager.transaction(async (tx) => {
      const c = await tx.findOne(Consultation, { where: { id: consultationId } });
      if (!c || c.status !== 'active') return null;

      const consultant = await tx.findOne(Consultant, {
        where: { id: c.consultantId },
      });
      const user = await tx.findOne(User, { where: { id: c.clientId } });
      if (!consultant || !user) return null;

      const already = Number(c.minutesUsed || 0);
      const target = Math.max(already, Number(targetElapsedMinutes || 0));
      const delta = +(target - already).toFixed(6);

      const price = Number(consultant.pricePerMinute || 0);
      const available = Number(user.credits || 0);

      let charge = 0;
      let minutesCharged = 0;
      let outOfCredits = available <= 0;

      if (delta > 0 && price > 0) {
        const desiredCost = +(price * delta).toFixed(2);
        charge = Math.min(desiredCost, +available.toFixed(2));
        minutesCharged = +(charge / price).toFixed(4);
        outOfCredits = charge < desiredCost - 0.001 || available - charge <= 0;
      } else if (delta > 0 && price === 0) {
        // Free consultation — count minutes but never charge
        minutesCharged = delta;
      }

      if (charge > 0) {
        user.credits = +(available - charge).toFixed(2);
        await tx.save(User, user);

        const credit = tx.create(Credit, {
          userId: user.id,
          amount: -charge,
          pricePerCredit: 0,
          totalPrice: 0,
          type: 'usage',
          status: 'completed',
        });
        await tx.save(Credit, credit);
      }

      if (minutesCharged > 0) {
        c.minutesUsed = +(already + minutesCharged).toFixed(4);
        c.creditsUsed = +(Number(c.creditsUsed || 0) + charge).toFixed(2);
        await tx.save(Consultation, c);
      }

      return {
        consultationId,
        minutesElapsed: target,
        minutesCharged: Number(c.minutesUsed),
        creditsRemaining: Number(user.credits),
        costSoFar: Number(c.creditsUsed),
        pricePerMinute: price,
        outOfCredits,
      };
    });
  }

  /**
   * Finalize a consultation: optionally bills any remaining elapsed minutes,
   * marks it completed, increments the consultant's counter, and records
   * the earning split using the consultant's commissionPercent.
   * Idempotent: returns the existing consultation if already completed.
   */
  async endConsultation(
    consultationId: string,
    finalElapsedMinutes?: number,
  ): Promise<Consultation | null> {
    // First, attempt a final charge using the existing transactional method.
    if (typeof finalElapsedMinutes === 'number' && finalElapsedMinutes > 0) {
      await this.chargeForMinutes(consultationId, finalElapsedMinutes).catch((err) =>
        this.logger.warn(`Final charge failed: ${err?.message}`),
      );
    }

    return this.consultationsRepo.manager.transaction(async (tx) => {
      const c = await tx.findOne(Consultation, { where: { id: consultationId } });
      if (!c) return null;
      if (c.status === 'completed') return c;

      c.status = 'completed';
      c.endedAt = new Date();
      await tx.save(Consultation, c);

      const consultant = await tx.findOne(Consultant, {
        where: { id: c.consultantId },
      });
      if (consultant) {
        consultant.consultationsCount = (consultant.consultationsCount || 0) + 1;
        await tx.save(Consultant, consultant);

        const commissionPercent = Number(consultant.commissionPercent ?? 50);
        const grossAmount = Number(c.creditsUsed || 0);
        const consultantAmount = +(grossAmount * (commissionPercent / 100)).toFixed(2);
        const platformAmount = +(grossAmount - consultantAmount).toFixed(2);

        if (grossAmount > 0) {
          const earning = tx.create(ConsultantEarning, {
            consultantId: consultant.id,
            consultationId: c.id,
            grossAmount,
            commissionPercent,
            consultantAmount,
            platformAmount,
          });
          await tx.save(ConsultantEarning, earning);
        }
      }

      return c;
    });
  }

  async findActive(consultationId: string) {
    return this.consultationsRepo.findOne({ where: { id: consultationId } });
  }
}
