import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { User } from '../database/entities/user.entity';
import { Consultant } from '../database/entities/consultant.entity';
import { Credit } from '../database/entities/credit.entity';
import { Consultation } from '../database/entities/consultation.entity';
import { Message } from '../database/entities/message.entity';

export const DatabaseConfig = (): TypeOrmModuleOptions => ({
  type: 'postgres',
  host: process.env.DB_HOST || 'postgres',
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USERNAME || 'ametista',
  password: process.env.DB_PASSWORD || 'ametista123',
  database: process.env.DB_NAME || 'ametista_tarot',
  entities: [User, Consultant, Credit, Consultation, Message],
  synchronize: process.env.NODE_ENV !== 'production',
  logging: process.env.NODE_ENV === 'development',
});
