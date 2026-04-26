import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Credit } from '../database/entities/credit.entity';
import { UsersService } from '../users/users.service';

@Injectable()
export class PaymentsService {
  constructor(
    @InjectRepository(Credit)
    private creditsRepository: Repository<Credit>,
    private usersService: UsersService,
  ) {}

  async createPaymentIntent(userId: string, amount: number, pricePerCredit: number) {
    const totalPrice = amount * pricePerCredit;

    const credit = this.creditsRepository.create({
      userId,
      amount,
      pricePerCredit,
      totalPrice,
      type: 'purchase',
      status: 'pending',
      transactionId: `txn_${Date.now()}`,
    });

    await this.creditsRepository.save(credit);

    return {
      id: credit.id,
      transactionId: credit.transactionId,
      amount,
      pricePerCredit,
      totalPrice,
      status: 'pending',
    };
  }

  async confirmPayment(transactionId: string) {
    const credit = await this.creditsRepository.findOne({
      where: { transactionId },
    });

    if (!credit) {
      throw new Error('Transação não encontrada');
    }

    credit.status = 'completed';
    await this.creditsRepository.save(credit);

    await this.usersService.addCredits(
      credit.userId,
      credit.amount,
      credit.pricePerCredit,
    );

    return credit;
  }

  async cancelPayment(transactionId: string) {
    const credit = await this.creditsRepository.findOne({
      where: { transactionId },
    });

    if (!credit) {
      throw new Error('Transação não encontrada');
    }

    credit.status = 'failed';
    await this.creditsRepository.save(credit);

    return credit;
  }
}
