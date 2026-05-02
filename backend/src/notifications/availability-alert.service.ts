import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { ConsultantAvailabilityAlert } from '../database/entities/consultant-availability-alert.entity';
import { Consultant } from '../database/entities/consultant.entity';
import { User } from '../database/entities/user.entity';
import { MailService } from '../mail/mail.service';

@Injectable()
export class AvailabilityAlertService {
  private readonly logger = new Logger(AvailabilityAlertService.name);

  constructor(
    @InjectRepository(ConsultantAvailabilityAlert)
    private alertsRepo: Repository<ConsultantAvailabilityAlert>,
    @InjectRepository(Consultant)
    private consultantsRepo: Repository<Consultant>,
    @InjectRepository(User)
    private usersRepo: Repository<User>,
    private mailService: MailService,
  ) {}

  async requestAlert(userId: string, consultantId: string) {
    const consultant = await this.consultantsRepo.findOne({ where: { id: consultantId } });
    if (!consultant) throw new NotFoundException('Consultor não encontrado');

    // Já existe um alerta pendente? Não duplica.
    const existing = await this.alertsRepo.findOne({
      where: { userId, consultantId, status: 'pending' },
    });
    if (existing) return { ok: true, alreadyActive: true, alertId: existing.id };

    const alert = this.alertsRepo.create({
      userId,
      consultantId,
      status: 'pending',
    });
    await this.alertsRepo.save(alert);
    return { ok: true, alreadyActive: false, alertId: alert.id };
  }

  async cancelAlert(userId: string, consultantId: string) {
    const result = await this.alertsRepo.update(
      { userId, consultantId, status: 'pending' },
      { status: 'cancelled' },
    );
    return { ok: true, cancelled: result.affected || 0 };
  }

  async getStatusForUser(userId: string, consultantId: string) {
    const pending = await this.alertsRepo.findOne({
      where: { userId, consultantId, status: 'pending' },
    });
    return { active: !!pending };
  }

  async getMyActiveAlerts(userId: string) {
    const alerts = await this.alertsRepo.find({
      where: { userId, status: 'pending' },
    });
    return alerts.map((a) => a.consultantId);
  }

  /**
   * Disparado quando um consultor fica online. Busca todos os alertas pendentes
   * para esse consultor, envia e-mail e marca como notificado. Idempotente — usa
   * uma única UPDATE para "garantir o lock" e só dispara e-mail para os IDs
   * efetivamente atualizados.
   */
  async dispatchForConsultantOnline(consultantId: string): Promise<number> {
    const pending = await this.alertsRepo.find({
      where: { consultantId, status: 'pending' },
    });
    if (pending.length === 0) return 0;

    const ids = pending.map((p) => p.id);
    const updateResult = await this.alertsRepo
      .createQueryBuilder()
      .update(ConsultantAvailabilityAlert)
      .set({ status: 'notified', notifiedAt: new Date() })
      .where('id IN (:...ids) AND status = :pending', { ids, pending: 'pending' })
      .execute();

    if (!updateResult.affected) return 0;

    const consultant = await this.consultantsRepo.findOne({ where: { id: consultantId } });
    if (!consultant) {
      this.logger.warn(`Consultor ${consultantId} não encontrado ao despachar alertas`);
      return 0;
    }

    const userIds = pending.map((p) => p.userId);
    const users = await this.usersRepo.find({ where: { id: In(userIds) } });

    let sent = 0;
    for (const user of users) {
      if (!user.email) continue;
      try {
        await this.mailService.sendConsultantOnlineNotification({
          to: user.email,
          userName: user.name || 'cliente',
          consultantName: consultant.name,
          consultantId: consultant.id,
        });
        sent++;
      } catch (err: any) {
        this.logger.error(
          `Falha ao notificar ${user.email} sobre ${consultant.name}: ${err?.message}`,
        );
      }
    }
    this.logger.log(
      `Alertas de disponibilidade despachados: consultor=${consultantId} enviados=${sent}/${users.length}`,
    );
    return sent;
  }
}
