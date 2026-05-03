import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { User } from '../database/entities/user.entity';
import { Consultant } from '../database/entities/consultant.entity';
import { Credit } from '../database/entities/credit.entity';
import { Consultation } from '../database/entities/consultation.entity';
import { Message } from '../database/entities/message.entity';
import { ConsultantEarning } from '../database/entities/consultant-earning.entity';
import { Transaction } from '../database/entities/transaction.entity';
import { ConsultantAvailabilityAlert } from '../database/entities/consultant-availability-alert.entity';
import { Review } from '../database/entities/review.entity';
import { Admin } from '../database/entities/admin.entity';
import { CommissionPayout } from '../database/entities/commission-payout.entity';
import { SystemSetting } from '../database/entities/system-setting.entity';
import { TermsVersion } from '../database/entities/terms-version.entity';
import { TermsAcceptance } from '../database/entities/terms-acceptance.entity';
import { PasswordResetToken } from '../database/entities/password-reset-token.entity';
import { ServiceOrder } from '../database/entities/service-order.entity';

export const DatabaseConfig = (): TypeOrmModuleOptions => ({
  type: 'postgres',
  host: process.env.DB_HOST || 'postgres',
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USERNAME || 'ametista',
  password: process.env.DB_PASSWORD || 'ametista123',
  database: process.env.DB_NAME || 'ametista_tarot',
  entities: [
    User,
    Consultant,
    Credit,
    Consultation,
    Message,
    ConsultantEarning,
    Transaction,
    ConsultantAvailabilityAlert,
    Review,
    Admin,
    CommissionPayout,
    SystemSetting,
    TermsVersion,
    TermsAcceptance,
    PasswordResetToken,
    ServiceOrder,
  ],
  synchronize: true,
  logging: process.env.NODE_ENV === 'development',
});
