import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConsultantsService } from './consultants.service';
import { ConsultantsController } from './consultants.controller';
import { Consultant } from '../database/entities/consultant.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Consultant])],
  providers: [ConsultantsService],
  controllers: [ConsultantsController],
  exports: [ConsultantsService],
})
export class ConsultantsModule {}
