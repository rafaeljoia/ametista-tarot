import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChatService } from './chat.service';
import { ChatGateway } from './chat.gateway';
import { Message } from '../database/entities/message.entity';
import { Consultation } from '../database/entities/consultation.entity';
import { PresenceModule } from '../presence/presence.module';

@Module({
  imports: [TypeOrmModule.forFeature([Message, Consultation]), PresenceModule],
  providers: [ChatService, ChatGateway],
  exports: [ChatService],
})
export class ChatModule {}
