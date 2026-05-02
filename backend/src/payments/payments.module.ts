import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { MercadoPagoService } from './mercado-pago.service';
import { Transaction } from '../database/entities/transaction.entity';
import { Credit } from '../database/entities/credit.entity';
import { User } from '../database/entities/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Transaction, Credit, User])],
  providers: [PaymentsService, MercadoPagoService],
  controllers: [PaymentsController],
  exports: [PaymentsService],
})
export class PaymentsModule {}
