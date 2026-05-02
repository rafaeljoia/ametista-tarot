import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Headers,
  Query,
  UseGuards,
  Request,
  ForbiddenException,
  BadRequestException,
  HttpCode,
  RawBodyRequest,
  Req,
  Logger,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PaymentsService } from './payments.service';
import { MercadoPagoService } from './mercado-pago.service';

@Controller('payments')
export class PaymentsController {
  private readonly logger = new Logger(PaymentsController.name);

  constructor(
    private payments: PaymentsService,
    private mercadoPago: MercadoPagoService,
  ) {}

  @Get('config')
  config() {
    return this.payments.publicConfig();
  }

  @Get('packages')
  packages() {
    return this.payments.listPackages();
  }

  @Post('pix')
  @UseGuards(AuthGuard('jwt'))
  async createPix(@Request() req, @Body() body: { packageId: string }) {
    if (req.user?.role !== 'user') throw new ForbiddenException();
    if (!body?.packageId) throw new BadRequestException('packageId é obrigatório');
    return this.payments.createPix({ userId: req.user.id, packageId: body.packageId });
  }

  @Post('card')
  @UseGuards(AuthGuard('jwt'))
  async createCard(
    @Request() req,
    @Body()
    body: {
      packageId: string;
      cardToken: string;
      paymentMethodId: string;
      installments?: number;
      payerEmail?: string;
      identification?: { type: string; number: string };
    },
  ) {
    if (req.user?.role !== 'user') throw new ForbiddenException();
    if (!body?.packageId || !body?.cardToken || !body?.paymentMethodId) {
      throw new BadRequestException(
        'packageId, cardToken e paymentMethodId são obrigatórios',
      );
    }
    return this.payments.createCard({
      userId: req.user.id,
      packageId: body.packageId,
      cardToken: body.cardToken,
      paymentMethodId: body.paymentMethodId,
      installments: body.installments,
      payerEmail: body.payerEmail,
      identification: body.identification,
    });
  }

  @Get('transactions')
  @UseGuards(AuthGuard('jwt'))
  async list(@Request() req) {
    if (req.user?.role !== 'user') throw new ForbiddenException();
    return this.payments.listForUser(req.user.id);
  }

  @Get('transactions/:id')
  @UseGuards(AuthGuard('jwt'))
  async findOne(@Request() req, @Param('id') id: string) {
    if (req.user?.role !== 'user') throw new ForbiddenException();
    return this.payments.findOneForUser(req.user.id, id);
  }

  /**
   * Mercado Pago webhook. Auth-less by design — protected by HMAC signature
   * validated against the raw request body bytes (NestFactory `rawBody: true`).
   * Always returns 200 unless the signature is invalid, so MP doesn't retry
   * forever on benign edge cases like unknown event types.
   */
  @Post('webhook')
  @HttpCode(200)
  async webhook(
    @Req() req: RawBodyRequest<any>,
    @Headers('x-signature') signature: string | undefined,
    @Headers('x-request-id') requestId: string | undefined,
    @Query('data.id') dataIdQuery: string | undefined,
    @Query('type') typeQuery: string | undefined,
    @Body() body: any,
  ) {
    const dataId = body?.data?.id || dataIdQuery;
    const valid = this.mercadoPago.validateWebhookSignature({
      signatureHeader: signature,
      requestId,
      dataId: dataId ? String(dataId) : undefined,
    });
    if (!valid) {
      this.logger.warn(`Webhook com assinatura inválida (data.id=${dataId})`);
      throw new ForbiddenException('Assinatura inválida');
    }

    return this.payments.handleWebhook({
      type: body?.type || typeQuery,
      action: body?.action,
      data: { id: dataId ? String(dataId) : undefined },
    });
  }
}
