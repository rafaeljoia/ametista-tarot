import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { ServiceOrder } from '../database/entities/service-order.entity';
import { Consultation } from '../database/entities/consultation.entity';
import { User } from '../database/entities/user.entity';
import { Consultant } from '../database/entities/consultant.entity';
import { SystemSettingsService } from '../system-settings/system-settings.service';
import { MailService } from '../mail/mail.service';

@Injectable()
export class ServiceOrdersService {
  private readonly logger = new Logger(ServiceOrdersService.name);

  constructor(
    @InjectRepository(ServiceOrder)
    private readonly ordersRepo: Repository<ServiceOrder>,
    @InjectRepository(Consultation)
    private readonly consultationsRepo: Repository<Consultation>,
    @InjectRepository(User)
    private readonly usersRepo: Repository<User>,
    @InjectRepository(Consultant)
    private readonly consultantsRepo: Repository<Consultant>,
    private readonly settings: SystemSettingsService,
    private readonly mail: MailService,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Cria uma ordem de "blessing" (banhos/orações) para o atendimento informado.
   * - Verifica oferta habilitada
   * - Cobra do saldo de créditos do cliente em transação atômica
   * - Notifica o consultor por e-mail com nome e e-mail do cliente
   */
  async createBlessing(input: { userId: string; consultationId: string }) {
    const offer = await this.settings.getPostCallOffer();
    if (!offer.enabled) {
      throw new BadRequestException('Oferta indisponível no momento');
    }
    const price = Number(offer.price);
    if (!Number.isFinite(price) || price <= 0) {
      throw new BadRequestException('Valor da oferta inválido');
    }

    const consultation = await this.consultationsRepo.findOne({
      where: { id: input.consultationId },
    });
    if (!consultation) throw new NotFoundException('Atendimento não encontrado');
    if (consultation.clientId !== input.userId) {
      throw new ForbiddenException('Atendimento não pertence ao usuário');
    }

    const user = await this.usersRepo.findOne({ where: { id: input.userId } });
    if (!user) throw new NotFoundException('Usuário não encontrado');

    const consultant = await this.consultantsRepo.findOne({
      where: { id: consultation.consultantId },
    });
    if (!consultant) throw new NotFoundException('Consultor não encontrado');

    // Já existe uma ordem para esse atendimento? evita duplicidade
    const existing = await this.ordersRepo.findOne({
      where: { consultationId: input.consultationId, kind: 'blessing' },
    });
    if (existing) {
      throw new BadRequestException(
        'Você já solicitou indicações de banhos para este atendimento',
      );
    }

    if (Number(user.credits) < price) {
      throw new BadRequestException(
        `Saldo insuficiente. Necessário R$ ${price.toFixed(2)} em créditos.`,
      );
    }

    // Transação: debita do user e cria a ordem
    const order = await this.dataSource.transaction(async (manager) => {
      const fresh = await manager.findOne(User, { where: { id: user.id } });
      if (!fresh) throw new NotFoundException('Usuário não encontrado');
      if (Number(fresh.credits) < price) {
        throw new BadRequestException('Saldo insuficiente');
      }
      fresh.credits = Number(fresh.credits) - price;
      await manager.save(fresh);

      const created = manager.create(ServiceOrder, {
        consultationId: consultation.id,
        clientId: user.id,
        clientName: user.name,
        clientEmail: user.email,
        consultantId: consultant.id,
        consultantName: consultant.name,
        consultantEmail: consultant.email,
        kind: 'blessing',
        priceCredits: price,
        status: 'pending',
      });
      return manager.save(created);
    });

    // Notifica o consultor (best-effort, não falha a transação)
    try {
      await this.mail.sendBlessingOrderToConsultant({
        to: consultant.email,
        consultantName: consultant.name,
        clientName: user.name,
        clientEmail: user.email,
        priceCredits: price,
        orderId: order.id,
      });
    } catch (err: any) {
      this.logger.error(
        `Falha ao notificar consultor sobre ordem ${order.id}: ${err?.message}`,
      );
    }

    return order;
  }

  async listForAdmin(input: { page?: number; pageSize?: number; status?: string }) {
    const page = Math.max(1, input.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, input.pageSize ?? 30));
    const qb = this.ordersRepo.createQueryBuilder('o').orderBy('o.createdAt', 'DESC');
    if (input.status) qb.andWhere('o.status = :s', { s: input.status });
    const [items, total] = await qb
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getManyAndCount();
    return { items, total, page, pageSize };
  }

  async listForConsultant(consultantId: string) {
    return this.ordersRepo.find({
      where: { consultantId },
      order: { createdAt: 'DESC' },
      take: 100,
    });
  }

  async markSent(input: { orderId: string; consultantId: string; notes?: string }) {
    const order = await this.ordersRepo.findOne({ where: { id: input.orderId } });
    if (!order) throw new NotFoundException('Ordem não encontrada');
    if (order.consultantId !== input.consultantId) {
      throw new ForbiddenException('Ordem não pertence ao consultor');
    }
    order.status = 'sent';
    order.sentAt = new Date();
    if (input.notes) order.notes = input.notes;
    return this.ordersRepo.save(order);
  }
}
