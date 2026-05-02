import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BillingService } from './billing.service';
import { Consultation } from '../database/entities/consultation.entity';
import { User } from '../database/entities/user.entity';
import { Consultant } from '../database/entities/consultant.entity';
import { Credit } from '../database/entities/credit.entity';
import { ConsultantEarning } from '../database/entities/consultant-earning.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Consultation, User, Consultant, Credit, ConsultantEarning]),
  ],
  providers: [BillingService],
  exports: [BillingService],
})
export class BillingModule {}
