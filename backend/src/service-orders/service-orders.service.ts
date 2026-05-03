import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, LessThan, Repository } from 'typeorm';
import { ServiceOrder } from '../database/entities/service-order.entity';
import { Consultation } from '../database/entities/consultation.entity';
import { User } from '../database/entities/user.entity';
import { Consultant } from '../database/entities/consultant.entity';
import { SystemSettingsService } from '../system-settings/system-settings.service';
import { MailService } from '../mail/mail.service';
import { InboxService } from '../inbox/inbox.service';

const VALID_KINDS = new Set(['bath', 'prayer', 'bath_prayer', 'blessing']);
const KIND_LABEL: Record<string, string> = {
  bath: 'banho',
  prayer: 'oração',
  bath_prayer: 'banho e oração',
  blessing: 'banhos / orações',
};

const EXPIRE_INTERVAL_MS = 5 * 60 * 1000; // 5 min

@Injectable()
export class ServiceOrdersService implements OnModuleInit {
  private readonly logger = new Logger(ServiceOrdersService.name);
  private expireTimer: NodeJS.Timeout | null = null;

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
    private readonly inbox: InboxService,
    private readonly dataSource: DataSource,
  ) {}

  onModuleInit() {
    // Roda em background — varre pedidos vencidos e reembolsa.
    this.expireTimer = setInterval(() => {
      this.expireOverdue().catch((err) =>
        this.logger.error(`expireOverdue falhou: ${err?.message}`),
      );
    }, EXPIRE_INTERVAL_MS);
    // Primeira execução logo após o boot
    setTimeout(() => {
      this.expireOverdue().catch(() => undefined);
    }, 30_000);
  }

  // ---------- Legado (post-call) ----------

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

    const deadlineHours = await this.settings.getOfferingDeadlineHours();
    const deadlineAt = new Date(Date.now() + deadlineHours * 3600 * 1000);

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
        deadlineAt,
      });
      return manager.save(created);
    });

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

  // ---------- Novo: pedido de banho/oração ----------

  async requestOffering(input: {
    userId: string;
    consultantId: string;
    kind: string;
    consultationId?: string | null;
    message?: string | null;
  }) {
    const kind = String(input.kind || '').toLowerCase();
    if (!VALID_KINDS.has(kind) || kind === 'blessing') {
      throw new BadRequestException(
        'Tipo inválido — escolha "bath" (banho) ou "prayer" (oração).',
      );
    }

    // Oferenda independe da flag de "post-call" — se admin tem preço > 0 cadastrado, está disponível.
    const offer = await this.settings.getPostCallOffer();
    const price = Number(offer.price);
    if (!Number.isFinite(price) || price <= 0) {
      throw new BadRequestException(
        'Valor da orientação não configurado. Peça ao administrador para definir um preço maior que zero.',
      );
    }

    const user = await this.usersRepo.findOne({ where: { id: input.userId } });
    if (!user) throw new NotFoundException('Usuário não encontrado');

    const consultant = await this.consultantsRepo.findOne({
      where: { id: input.consultantId },
    });
    if (!consultant) throw new NotFoundException('Consultor não encontrado');

    let consultationId: string | null = null;
    if (input.consultationId) {
      const consultation = await this.consultationsRepo.findOne({
        where: { id: input.consultationId },
      });
      if (consultation && consultation.clientId === input.userId) {
        consultationId = consultation.id;
        // Evita pedido duplicado pra mesma consulta (cliente clicando 2x no popup, etc.)
        const dup = await this.ordersRepo.findOne({
          where: { consultationId, clientId: user.id },
        });
        if (dup && (dup.status === 'pending' || dup.status === 'delivered' || dup.status === 'sent')) {
          throw new BadRequestException(
            'Você já solicitou uma orientação para este atendimento.',
          );
        }
      }
    }

    const userCredits = Number(user.credits);
    if (!Number.isFinite(userCredits) || userCredits < price) {
      throw new BadRequestException(
        `Saldo insuficiente. Você tem R$ ${(Number.isFinite(userCredits) ? userCredits : 0).toFixed(2)} e o pedido custa R$ ${price.toFixed(2)}.`,
      );
    }

    const deadlineHours = await this.settings.getOfferingDeadlineHours();
    const deadlineAt = new Date(Date.now() + deadlineHours * 3600 * 1000);
    const message = (input.message || '').toString().trim().slice(0, 1000) || null;

    const order = await this.dataSource.transaction(async (manager) => {
      const fresh = await manager.findOne(User, { where: { id: user.id } });
      if (!fresh) throw new NotFoundException('Usuário não encontrado');
      if (Number(fresh.credits) < price) {
        throw new BadRequestException('Saldo insuficiente');
      }
      fresh.credits = Number(fresh.credits) - price;
      await manager.save(fresh);

      const created = manager.create(ServiceOrder, {
        consultationId,
        clientId: user.id,
        clientName: user.name,
        clientEmail: user.email,
        consultantId: consultant.id,
        consultantName: consultant.name,
        consultantEmail: consultant.email,
        kind,
        priceCredits: price,
        status: 'pending',
        requestMessage: message,
        deadlineAt,
      });
      return manager.save(created);
    });

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
        `Falha ao notificar consultor sobre oferenda ${order.id}: ${err?.message}`,
      );
    }

    return order;
  }

  // ---------- Entrega ----------

  async deliverOffering(input: {
    orderId: string;
    consultantId: string;
    deliveryText: string;
  }) {
    const text = (input.deliveryText || '').trim();
    if (text.length < 10) {
      throw new BadRequestException('Mensagem muito curta (mínimo 10 caracteres)');
    }
    if (text.length > 8000) {
      throw new BadRequestException('Mensagem muito longa (máximo 8000 caracteres)');
    }

    const order = await this.ordersRepo.findOne({ where: { id: input.orderId } });
    if (!order) throw new NotFoundException('Pedido não encontrado');
    if (order.consultantId !== input.consultantId) {
      throw new ForbiddenException('Pedido não pertence ao consultor');
    }
    if (order.status === 'delivered' || order.status === 'sent') {
      throw new BadRequestException('Pedido já foi entregue');
    }
    if (order.status === 'expired' || order.status === 'cancelled') {
      throw new BadRequestException('Pedido não pode mais ser entregue');
    }

    const now = new Date();
    order.status = 'delivered';
    order.deliveryText = text;
    order.deliveredAt = now;
    order.sentAt = now;
    await this.ordersRepo.save(order);

    const kindLabel = KIND_LABEL[order.kind] || 'orientação';

    // 1) Email para o cliente
    try {
      await this.mail.sendOfferingDeliveredToClient({
        to: order.clientEmail,
        clientName: order.clientName,
        consultantName: order.consultantName,
        kindLabel,
        deliveryText: text,
      });
    } catch (err: any) {
      this.logger.error(
        `Falha ao enviar email de entrega da oferenda ${order.id}: ${err?.message}`,
      );
    }

    // 2) Inbox interna
    try {
      await this.inbox.push({
        userId: order.clientId,
        kind: 'offering_delivered',
        title: `Sua ${kindLabel} foi enviada por ${order.consultantName}`,
        body: text,
        link: '/dashboard/oferendas',
      });
    } catch (err: any) {
      this.logger.error(
        `Falha ao gravar inbox da oferenda ${order.id}: ${err?.message}`,
      );
    }

    return order;
  }

  // ---------- Expiração ----------

  async expireOverdue(): Promise<{ expired: number }> {
    const now = new Date();
    const overdue = await this.ordersRepo.find({
      where: { status: 'pending', deadlineAt: LessThan(now) },
      take: 100,
    });
    if (!overdue.length) return { expired: 0 };

    let count = 0;
    for (const order of overdue) {
      try {
        await this.dataSource.transaction(async (manager) => {
          const fresh = await manager.findOne(ServiceOrder, { where: { id: order.id } });
          if (!fresh || fresh.status !== 'pending') return;
          fresh.status = 'expired';
          await manager.save(fresh);

          // reembolso
          const user = await manager.findOne(User, { where: { id: fresh.clientId } });
          if (user) {
            user.credits = Number(user.credits) + Number(fresh.priceCredits);
            await manager.save(user);
          }
        });
        count++;

        // Inbox: avisar cliente do reembolso
        try {
          await this.inbox.push({
            userId: order.clientId,
            kind: 'offering_expired',
            title: `Pedido expirado — créditos devolvidos`,
            body:
              `Seu pedido de ${KIND_LABEL[order.kind] || 'orientação'} para ${order.consultantName} ` +
              `não foi entregue dentro do prazo. Os R$ ${Number(order.priceCredits).toFixed(2)} ` +
              `foram devolvidos ao seu saldo de créditos.`,
            link: '/dashboard/oferendas',
          });
        } catch {
          /* best-effort */
        }
      } catch (err: any) {
        this.logger.error(`Falha ao expirar pedido ${order.id}: ${err?.message}`);
      }
    }
    if (count > 0) this.logger.log(`Expirados ${count} pedidos pendentes`);
    return { expired: count };
  }

  // ---------- Listagens ----------

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

  async listForClient(clientId: string) {
    return this.ordersRepo.find({
      where: { clientId },
      order: { createdAt: 'DESC' },
      take: 100,
    });
  }

  // ---------- Legado: marcar como enviado (mantido) ----------

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
