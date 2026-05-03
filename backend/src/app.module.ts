import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ConsultantsModule } from './consultants/consultants.module';
import { PaymentsModule } from './payments/payments.module';
import { ChatModule } from './chat/chat.module';
import { PresenceModule } from './presence/presence.module';
import { BillingModule } from './billing/billing.module';
import { ConsultationsModule } from './consultations/consultations.module';
import { UploadsModule } from './uploads/uploads.module';
import { NotificationsModule } from './notifications/notifications.module';
import { MailModule } from './mail/mail.module';
import { ReviewsModule } from './reviews/reviews.module';
import { AdminModule } from './admin/admin.module';
import { SystemSettingsModule } from './system-settings/system-settings.module';
import { WebrtcModule } from './webrtc/webrtc.module';
import { TermsModule } from './terms/terms.module';
import { ServiceOrdersModule } from './service-orders/service-orders.module';
import { InboxModule } from './inbox/inbox.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseConfig } from './config/database.config';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),
    TypeOrmModule.forRoot(DatabaseConfig()),
    MailModule,
    PresenceModule,
    AuthModule,
    UsersModule,
    ConsultantsModule,
    PaymentsModule,
    BillingModule,
    NotificationsModule,
    ChatModule,
    ConsultationsModule,
    UploadsModule,
    ReviewsModule,
    AdminModule,
    SystemSettingsModule,
    WebrtcModule,
    TermsModule,
    ServiceOrdersModule,
    InboxModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
