import { Controller, Post, Body, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PaymentsService } from './payments.service';

@Controller('payments')
export class PaymentsController {
  constructor(private paymentsService: PaymentsService) {}

  @Post('create-intent')
  @UseGuards(AuthGuard('jwt'))
  async createPaymentIntent(
    @Request() req,
    @Body() body: { amount: number; pricePerCredit: number },
  ) {
    return this.paymentsService.createPaymentIntent(
      req.user.id,
      body.amount,
      body.pricePerCredit,
    );
  }

  @Post('confirm')
  @UseGuards(AuthGuard('jwt'))
  async confirmPayment(@Body() body: { transactionId: string }) {
    return this.paymentsService.confirmPayment(body.transactionId);
  }

  @Post('cancel')
  @UseGuards(AuthGuard('jwt'))
  async cancelPayment(@Body() body: { transactionId: string }) {
    return this.paymentsService.cancelPayment(body.transactionId);
  }
}
