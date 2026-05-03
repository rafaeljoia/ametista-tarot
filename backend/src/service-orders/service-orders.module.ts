import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ServiceOrder } from '../database/entities/service-order.entity';
import { Consultation } from '../database/entities/consultation.entity';
import { User } from '../database/entities/user.entity';
import { Consultant } from '../database/entities/consultant.entity';
import { ServiceOrdersService } from './service-orders.service';
import { ServiceOrdersController } from './service-orders.controller';
import { SystemSettingsModule } from '../system-settings/system-settings.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ServiceOrder, Consultation, User, Consultant]),
    SystemSettingsModule,
  ],
  controllers: [ServiceOrdersController],
  providers: [ServiceOrdersService],
  exports: [ServiceOrdersService],
})
export class ServiceOrdersModule {}
