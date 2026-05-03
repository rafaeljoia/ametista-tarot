import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ServiceOrder } from '../database/entities/service-order.entity';
import { Consultation } from '../database/entities/consultation.entity';
import { User } from '../database/entities/user.entity';
import { Consultant } from '../database/entities/consultant.entity';
import { ServiceOrdersService } from './service-orders.service';
import { ServiceOrdersController } from './service-orders.controller';
import { SystemSettingsModule } from '../system-settings/system-settings.module';
import { MailModule } from '../mail/mail.module';
import { InboxModule } from '../inbox/inbox.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ServiceOrder, Consultation, User, Consultant]),
    SystemSettingsModule,
    MailModule,
    InboxModule,
  ],
  controllers: [ServiceOrdersController],
  providers: [ServiceOrdersService],
  exports: [ServiceOrdersService],
})
export class ServiceOrdersModule {}
