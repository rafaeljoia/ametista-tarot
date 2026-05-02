import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { MercadoPagoConfig, Payment } from 'mercadopago';
import * as crypto from 'crypto';

export interface CreatePixInput {
  amount: number;
  description: string;
  payerEmail: string;
  payerName: string;
  externalReference: string;
  expiresInSeconds?: number;
}

export interface CreateCardInput {
  amount: number;
  description: string;
  cardToken: string;
  paymentMethodId: string;
  installments: number;
  payerEmail: string;
  identification?: { type: string; number: string };
  externalReference: string;
}

export interface MpPaymentResult {
  id: string;
  status: string;
  statusDetail?: string;
  qrCode?: string;
  qrCodeBase64?: string;
  ticketUrl?: string;
  raw: any;
}

@Injectable()
export class MercadoPagoService {
  private readonly logger = new Logger(MercadoPagoService.name);
  private client: MercadoPagoConfig | null = null;
  private paymentApi: Payment | null = null;
  private readonly accessToken = process.env.MP_ACCESS_TOKEN || '';
  private readonly webhookSecret = process.env.MP_WEBHOOK_SECRET || '';

  constructor() {
    if (this.accessToken) {
      this.client = new MercadoPagoConfig({
        accessToken: this.accessToken,
        options: { timeout: 10000 },
      });
      this.paymentApi = new Payment(this.client);
      this.logger.log('Mercado Pago client inicializado');
    } else {
      this.logger.warn(
        'MP_ACCESS_TOKEN não configurado — endpoints de pagamento responderão 503',
      );
    }
  }

  isConfigured() {
    return !!this.paymentApi;
  }

  publicKey() {
    return process.env.MP_PUBLIC_KEY || '';
  }

  private ensureReady(): Payment {
    if (!this.paymentApi) {
      throw new ServiceUnavailableException(
        'Gateway de pagamento não configurado — defina MP_ACCESS_TOKEN.',
      );
    }
    return this.paymentApi;
  }

  async createPix(input: CreatePixInput): Promise<MpPaymentResult> {
    const payment = this.ensureReady();
    const expiresAt = new Date(
      Date.now() + (input.expiresInSeconds ?? 1800) * 1000,
    );
    const result = await payment.create({
      body: {
        transaction_amount: Number(input.amount.toFixed(2)),
        description: input.description,
        payment_method_id: 'pix',
        external_reference: input.externalReference,
        date_of_expiration: expiresAt.toISOString(),
        payer: {
          email: input.payerEmail,
          first_name: input.payerName,
        },
      },
      requestOptions: { idempotencyKey: input.externalReference },
    } as any);

    const poi: any = (result as any)?.point_of_interaction?.transaction_data;
    return {
      id: String((result as any).id),
      status: String((result as any).status),
      statusDetail: (result as any).status_detail,
      qrCode: poi?.qr_code,
      qrCodeBase64: poi?.qr_code_base64,
      ticketUrl: poi?.ticket_url,
      raw: result,
    };
  }

  async createCardPayment(input: CreateCardInput): Promise<MpPaymentResult> {
    const payment = this.ensureReady();
    const result = await payment.create({
      body: {
        transaction_amount: Number(input.amount.toFixed(2)),
        token: input.cardToken,
        description: input.description,
        installments: input.installments || 1,
        payment_method_id: input.paymentMethodId,
        external_reference: input.externalReference,
        payer: {
          email: input.payerEmail,
          ...(input.identification ? { identification: input.identification } : {}),
        },
      },
      requestOptions: { idempotencyKey: input.externalReference },
    } as any);

    return {
      id: String((result as any).id),
      status: String((result as any).status),
      statusDetail: (result as any).status_detail,
      raw: result,
    };
  }

  async getPayment(gatewayId: string): Promise<MpPaymentResult | null> {
    const payment = this.ensureReady();
    try {
      const res = await payment.get({ id: gatewayId });
      const poi: any = (res as any)?.point_of_interaction?.transaction_data;
      return {
        id: String((res as any).id),
        status: String((res as any).status),
        statusDetail: (res as any).status_detail,
        qrCode: poi?.qr_code,
        qrCodeBase64: poi?.qr_code_base64,
        ticketUrl: poi?.ticket_url,
        raw: res,
      };
    } catch (err: any) {
      this.logger.warn(`getPayment(${gatewayId}) falhou: ${err?.message}`);
      return null;
    }
  }

  /**
   * Validate Mercado Pago webhook signature.
   * https://www.mercadopago.com.br/developers/en/docs/your-integrations/notifications/webhooks
   *
   * Returns true when:
   *   - the signature matches, OR
   *   - no MP_WEBHOOK_SECRET is configured (dev mode — logged as warning).
   */
  validateWebhookSignature(args: {
    signatureHeader?: string;
    requestId?: string;
    dataId?: string;
  }): boolean {
    if (!this.webhookSecret) {
      this.logger.warn(
        'MP_WEBHOOK_SECRET ausente — assinatura do webhook NÃO está sendo validada',
      );
      return true;
    }
    const { signatureHeader, requestId, dataId } = args;
    if (!signatureHeader || !dataId) return false;

    // Parse "ts=...,v1=..."
    const parts = signatureHeader.split(',').reduce<Record<string, string>>((acc, kv) => {
      const [k, v] = kv.split('=');
      if (k && v) acc[k.trim()] = v.trim();
      return acc;
    }, {});
    const ts = parts['ts'];
    const v1 = parts['v1'];
    if (!ts || !v1) return false;

    const manifest = `id:${dataId};request-id:${requestId ?? ''};ts:${ts};`;
    const expected = crypto
      .createHmac('sha256', this.webhookSecret)
      .update(manifest)
      .digest('hex');

    try {
      return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(v1));
    } catch {
      return false;
    }
  }
}
