import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { Admin } from '../database/entities/admin.entity';
import { User } from '../database/entities/user.entity';
import { Consultant } from '../database/entities/consultant.entity';
import { Consultation } from '../database/entities/consultation.entity';
import { Transaction } from '../database/entities/transaction.entity';
import { ConsultantEarning } from '../database/entities/consultant-earning.entity';
import { CommissionPayout } from '../database/entities/commission-payout.entity';
import { Message } from '../database/entities/message.entity';
import { ReviewsModule } from '../reviews/reviews.module';
import { SystemSettingsModule } from '../system-settings/system-settings.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Admin,
      User,
      Consultant,
      Consultation,
      Transaction,
      ConsultantEarning,
      CommissionPayout,
      Message,
    ]),
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'your-secret-key',
      signOptions: { expiresIn: '12h' },
    }),
    ReviewsModule,
    SystemSettingsModule,
  ],
  controllers: [AdminController],
  providers: [AdminService],
  exports: [AdminService],
})
export class AdminModule {}
