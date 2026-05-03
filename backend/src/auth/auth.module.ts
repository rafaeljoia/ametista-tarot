import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './strategies/jwt.strategy';
import { User } from '../database/entities/user.entity';
import { Consultant } from '../database/entities/consultant.entity';
import { Admin } from '../database/entities/admin.entity';
import { PasswordResetToken } from '../database/entities/password-reset-token.entity';
import { TermsModule } from '../terms/terms.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Consultant, Admin, PasswordResetToken]),
    PassportModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'your-secret-key',
      signOptions: { expiresIn: '24h' },
    }),
    TermsModule,
  ],
  providers: [AuthService, JwtStrategy],
  controllers: [AuthController],
  exports: [AuthService, JwtStrategy, PassportModule],
})
export class AuthModule {}
