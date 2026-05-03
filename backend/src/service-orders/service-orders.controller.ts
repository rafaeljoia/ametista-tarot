import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AdminGuard } from '../admin/admin.guard';
import { ServiceOrdersService } from './service-orders.service';

@Controller()
export class ServiceOrdersController {
  constructor(private readonly orders: ServiceOrdersService) {}

  /** Cliente solicita oferenda (banho/oração) — endpoint genérico (usa-se em qualquer tela) */
  @Post('service-orders/request')
  @UseGuards(AuthGuard('jwt'))
  async requestOffering(
    @Request() req: any,
    @Body()
    body: {
      consultantId: string;
      kind: 'bath' | 'prayer' | 'bath_prayer';
      consultationId?: string;
      message?: string;
    },
  ) {
    return this.orders.requestOffering({
      userId: req.user.id,
      consultantId: body?.consultantId,
      kind: body?.kind,
      consultationId: body?.consultationId || null,
      message: body?.message || null,
    });
  }

  /** Cliente: solicita do post-call (legado, mantém compatibilidade) */
  @Post('service-orders/blessing')
  @UseGuards(AuthGuard('jwt'))
  async createBlessing(
    @Request() req: any,
    @Body() body: { consultationId?: string },
  ) {
    return this.orders.createBlessing({
      userId: req.user.id,
      consultationId: body?.consultationId || '',
    });
  }

  /** Cliente: lista as próprias oferendas */
  @Get('me/service-orders')
  @UseGuards(AuthGuard('jwt'))
  async myOrders(@Request() req: any) {
    const items = await this.orders.listForClient(req.user.id);
    return { items };
  }

  /** Consultor: lista as oferendas recebidas */
  @Get('consultant/service-orders')
  @UseGuards(AuthGuard('jwt'))
  async consultantOrders(@Request() req: any) {
    return this.orders.listForConsultant(req.user.id);
  }

  /** Consultor: entrega (texto) — novo fluxo */
  @Post('consultant/service-orders/:id/deliver')
  @UseGuards(AuthGuard('jwt'))
  async deliver(
    @Request() req: any,
    @Param('id') id: string,
    @Body() body: { deliveryText: string },
  ) {
    return this.orders.deliverOffering({
      orderId: id,
      consultantId: req.user.id,
      deliveryText: body?.deliveryText || '',
    });
  }

  /** Consultor: marcar como enviado (legado, mantém para ordens antigas) */
  @Patch('consultant/service-orders/:id/sent')
  @UseGuards(AuthGuard('jwt'))
  async markSent(
    @Request() req: any,
    @Param('id') id: string,
    @Body() body: { notes?: string },
  ) {
    return this.orders.markSent({
      orderId: id,
      consultantId: req.user.id,
      notes: body?.notes,
    });
  }

  /** Admin lista todas as ordens */
  @Get('admin/service-orders')
  @UseGuards(AuthGuard('jwt'), AdminGuard)
  async adminList(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('status') status?: string,
  ) {
    return this.orders.listForAdmin({
      page: page ? parseInt(page) : 1,
      pageSize: pageSize ? parseInt(pageSize) : 30,
      status,
    });
  }
}
