import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConsultationsController } from './consultations.controller';
import { ConsultationsService } from './consultations.service';
import { Consultation } from '../database/entities/consultation.entity';
import { Consultant } from '../database/entities/consultant.entity';
import { User } from '../database/entities/user.entity';
import { BillingModule } from '../billing/billing.module';
import { ChatModule } from '../chat/chat.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Consultation, Consultant, User]),
    BillingModule,
    forwardRef(() => ChatModule),
  ],
  controllers: [ConsultationsController],
  providers: [ConsultationsService],
  exports: [ConsultationsService],
})
export class ConsultationsModule {}
