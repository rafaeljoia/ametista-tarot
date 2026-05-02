import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConsultantsService } from './consultants.service';
import { ConsultantsController } from './consultants.controller';
import { Consultant } from '../database/entities/consultant.entity';
import { Consultation } from '../database/entities/consultation.entity';
import { PresenceModule } from '../presence/presence.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Consultant, Consultation]),
    PresenceModule,
  ],
  providers: [ConsultantsService],
  controllers: [ConsultantsController],
  exports: [ConsultantsService],
})
export class ConsultantsModule {}
