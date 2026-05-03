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

  /** Cliente autenticado solicita indicação de banhos/orações */
  @Post('service-orders/blessing')
  @UseGuards(AuthGuard('jwt'))
  async createBlessing(
    @Request() req: any,
    @Body() body: { consultationId?: string },
  ) {
    return this.orders.createBlessing({
      userId: req.user.sub,
      consultationId: body?.consultationId || '',
    });
  }

  /** Consultor lista ordens recebidas */
  @Get('consultant/service-orders')
  @UseGuards(AuthGuard('jwt'))
  async myOrders(@Request() req: any) {
    return this.orders.listForConsultant(req.user.sub);
  }

  /** Consultor marca como enviada */
  @Patch('consultant/service-orders/:id/sent')
  @UseGuards(AuthGuard('jwt'))
  async markSent(
    @Request() req: any,
    @Param('id') id: string,
    @Body() body: { notes?: string },
  ) {
    return this.orders.markSent({
      orderId: id,
      consultantId: req.user.sub,
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
