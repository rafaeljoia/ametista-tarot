import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AvailabilityAlertService } from './availability-alert.service';
import { ConsultantAvailabilityAlert } from '../database/entities/consultant-availability-alert.entity';
import { Consultant } from '../database/entities/consultant.entity';
import { User } from '../database/entities/user.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([ConsultantAvailabilityAlert, Consultant, User]),
  ],
  providers: [AvailabilityAlertService],
  exports: [AvailabilityAlertService],
})
export class NotificationsModule {}
