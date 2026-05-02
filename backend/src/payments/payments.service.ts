import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Transaction, TransactionStatus } from '../database/entities/transaction.entity';
import { Credit } from '../database/entities/credit.entity';
import { User } from '../database/entities/user.entity';
import { CREDIT_PACKAGES, findPackage } from './credit-packages';
import { MercadoPagoService } from './mercado-pago.service';
import { MailService } from '../mail/mail.service';

interface CreatePixArgs {
  userId: string;
  packageId: string;
}

interface CreateCardArgs {
  userId: string;
  packageId: string;
  cardToken: string;
  paymentMethodId: string;
  installments?: number;
  payerEmail?: string;
  identification?: { type: string; number: string };
}

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    @InjectRepository(Transaction)
    private transactionsRepo: Repository<Transaction>,
    @InjectRepository(Credit)
    private creditsRepo: Repository<Credit>,
    @InjectRepository(User)
    private usersRepo: Repository<User>,
    private mercadoPago: MercadoPagoService,
    private mail: MailService,
  ) {}

  listPackages() {
    return CREDIT_PACKAGES;
  }

  publicConfig() {
    return {
      mpPublicKey: this.mercadoPago.publicKey(),
      packages: CREDIT_PACKAGES,
    };
  }

  async listForUser(userId: string) {
    return this.transactionsRepo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  async findOneForUser(userId: string, id: string) {
    const t = await this.transactionsRepo.findOne({ where: { id } });
    if (!t || t.userId !== userId) throw new NotFoundException('Transação não encontrada');
    return this.toPublic(t);
  }

  async createPix({ userId, packageId }: CreatePixArgs) {
    const pkg = findPackage(packageId);
    if (!pkg) throw new BadRequestException('Pacote inválido');

    const user = await this.usersRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('Usuário não encontrado');

    const tx = this.transactionsRepo.create({
      userId,
      packageId: pkg.id,
      gross: pkg.gross,
      net: 0,
      creditsAmount: pkg.credits,
      method: 'pix',
      status: 'pending',
      gatewayId: null,
      gatewayMeta: null,
      creditedAt: null,
      expiresAt: new Date(Date.now() + 30 * 60 * 1000),
    });
    await this.transactionsRepo.save(tx);

    try {
      const mpResult = await this.mercadoPago.createPix({
        amount: pkg.gross,
        description: `${pkg.credits} créditos Ametista Tarot`,
        payerEmail: user.email,
        payerName: user.name,
        externalReference: tx.id,
        expiresInSeconds: 30 * 60,
      });

      tx.gatewayId = mpResult.id;
      tx.gatewayMeta = {
        qrCode: mpResult.qrCode,
        qrCodeBase64: mpResult.qrCodeBase64,
        ticketUrl: mpResult.ticketUrl,
        statusDetail: mpResult.statusDetail,
      };
      tx.status = this.mapMpStatus(mpResult.status);
      await this.transactionsRepo.save(tx);

      return {
        transactionId: tx.id,
        status: tx.status,
        qrCode: mpResult.qrCode,
        qrCodeBase64: mpResult.qrCodeBase64,
        copyPaste: mpResult.qrCode,
        ticketUrl: mpResult.ticketUrl,
        expiresAt: tx.expiresAt,
        gross: pkg.gross,
        credits: pkg.credits,
      };
    } catch (err: any) {
      tx.status = 'rejected';
      tx.gatewayMeta = { error: err?.message };
      await this.transactionsRepo.save(tx);
      throw new BadRequestException(`Falha ao gerar PIX: ${err?.message}`);
    }
  }

  async createCard(args: CreateCardArgs) {
    const pkg = findPackage(args.packageId);
    if (!pkg) throw new BadRequestException('Pacote inválido');

    const user = await this.usersRepo.findOne({ where: { id: args.userId } });
    if (!user) throw new NotFoundException('Usuário não encontrado');

    const tx = this.transactionsRepo.create({
      userId: args.userId,
      packageId: pkg.id,
      gross: pkg.gross,
      net: 0,
      creditsAmount: pkg.credits,
      method: 'card',
      status: 'pending',
      gatewayId: null,
      gatewayMeta: null,
      creditedAt: null,
      expiresAt: null,
    });
    await this.transactionsRepo.save(tx);

    try {
      const mpResult = await this.mercadoPago.createCardPayment({
        amount: pkg.gross,
        description: `${pkg.credits} créditos Ametista Tarot`,
        cardToken: args.cardToken,
        paymentMethodId: args.paymentMethodId,
        installments: args.installments || 1,
        payerEmail: args.payerEmail || user.email,
        identification: args.identification,
        externalReference: tx.id,
      });

      tx.gatewayId = mpResult.id;
      tx.gatewayMeta = { statusDetail: mpResult.statusDetail };
      tx.status = this.mapMpStatus(mpResult.status);
      await this.transactionsRepo.save(tx);

      if (tx.status === 'approved') {
        await this.applyApproval(tx.id);
      }

      return this.toPublic(
        await this.transactionsRepo.findOne({ where: { id: tx.id } }) || tx,
      );
    } catch (err: any) {
      tx.status = 'rejected';
      tx.gatewayMeta = { error: err?.message };
      await this.transactionsRepo.save(tx);
      throw new BadRequestException(`Pagamento recusado: ${err?.message}`);
    }
  }

  /**
   * Webhook handler. Idempotent: if creditsAmount has already been credited
   * (creditedAt set), it never re-credits. Looks up the latest authoritative
   * status from MP API instead of trusting the webhook payload.
   */
  async handleWebhook(payload: { type?: string; action?: string; data?: { id?: string } }) {
    const dataId = payload?.data?.id;
    if (!dataId) {
      this.logger.warn(`Webhook sem data.id ignorado: ${JSON.stringify(payload)}`);
      return { ok: true, ignored: true };
    }

    // Only handle payment notifications.
    const type = payload.type || (payload.action || '').split('.')[0];
    if (type && type !== 'payment') {
      return { ok: true, ignored: true };
    }

    const mp = await this.mercadoPago.getPayment(String(dataId));
    if (!mp) {
      this.logger.warn(`Webhook: pagamento ${dataId} não encontrado na MP`);
      return { ok: true, notFound: true };
    }

    const externalRef: string | undefined = (mp.raw as any)?.external_reference;
    let tx: Transaction | null = null;
    if (externalRef) {
      tx = await this.transactionsRepo.findOne({ where: { id: externalRef } });
    }
    if (!tx) {
      tx = await this.transactionsRepo.findOne({ where: { gatewayId: String(dataId) } });
    }
    if (!tx) {
      this.logger.warn(`Webhook: sem transaction local para gatewayId=${dataId}`);
      return { ok: true, notFound: true };
    }

    const newStatus = this.mapMpStatus(mp.status);
    tx.gatewayId = String(dataId);
    tx.status = newStatus;
    tx.gatewayMeta = {
      ...(tx.gatewayMeta || {}),
      statusDetail: mp.statusDetail,
      lastWebhookAt: new Date().toISOString(),
    };
    await this.transactionsRepo.save(tx);

    if (newStatus === 'approved') {
      await this.applyApproval(tx.id);
    }

    return { ok: true, transactionId: tx.id, status: tx.status };
  }

  /**
   * Atomically grant credits if not yet granted. Uses a pessimistic lock on
   * the transaction row plus a guard on `creditedAt` so concurrent webhooks
   * never double-credit a user.
   */
  private async applyApproval(transactionId: string): Promise<void> {
    let creditedNow = false;
    let userIdToNotify: string | null = null;
    let granted = 0;
    let gross = 0;
    let methodLabel = '';

    await this.transactionsRepo.manager.transaction(async (m) => {
      const tx = await m.findOne(Transaction, {
        where: { id: transactionId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!tx) return;
      if (tx.status !== 'approved') return;
      if (tx.creditedAt) return; // already credited — idempotent no-op

      const user = await m.findOne(User, {
        where: { id: tx.userId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!user) return;

      // Atomic SQL-level increment — defends against any code path that
      // updates credits without holding the same row lock.
      await m.increment(User, { id: tx.userId }, 'credits', tx.creditsAmount);

      const pricePerCredit =
        tx.creditsAmount > 0 ? +(Number(tx.gross) / tx.creditsAmount).toFixed(4) : 0;
      const credit = m.create(Credit, {
        userId: tx.userId,
        amount: tx.creditsAmount,
        pricePerCredit,
        totalPrice: Number(tx.gross),
        type: 'purchase',
        status: 'completed',
        transactionId: tx.id,
      });
      await m.save(Credit, credit);

      tx.creditedAt = new Date();
      await m.save(Transaction, tx);

      creditedNow = true;
      userIdToNotify = tx.userId;
      granted = tx.creditsAmount;
      gross = Number(tx.gross);
      methodLabel = tx.method;
    });

    if (creditedNow && userIdToNotify) {
      const user = await this.usersRepo.findOne({ where: { id: userIdToNotify } });
      if (user) {
        await this.mail.sendPaymentConfirmation({
          to: user.email,
          name: user.name,
          gross,
          credits: granted,
          method: methodLabel,
          transactionId,
        });
      }
    }
  }

  private mapMpStatus(mpStatus: string): TransactionStatus {
    switch ((mpStatus || '').toLowerCase()) {
      case 'approved':
        return 'approved';
      case 'pending':
      case 'in_process':
      case 'authorized':
        return 'pending';
      case 'rejected':
        return 'rejected';
      case 'refunded':
      case 'charged_back':
        return 'refunded';
      case 'cancelled':
        return 'cancelled';
      default:
        return 'pending';
    }
  }

  private toPublic(tx: Transaction) {
    return {
      id: tx.id,
      packageId: tx.packageId,
      gross: Number(tx.gross),
      creditsAmount: tx.creditsAmount,
      method: tx.method,
      status: tx.status,
      gatewayId: tx.gatewayId,
      qrCode: (tx.gatewayMeta as any)?.qrCode,
      qrCodeBase64: (tx.gatewayMeta as any)?.qrCodeBase64,
      copyPaste: (tx.gatewayMeta as any)?.qrCode,
      ticketUrl: (tx.gatewayMeta as any)?.ticketUrl,
      expiresAt: tx.expiresAt,
      creditedAt: tx.creditedAt,
      createdAt: tx.createdAt,
    };
  }
}
