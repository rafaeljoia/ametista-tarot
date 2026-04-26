import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChatService } from './chat.service';
import { ChatGateway } from './chat.gateway';
import { Message } from '../database/entities/message.entity';
import { Consultation } from '../database/entities/consultation.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Message, Consultation])],
  providers: [ChatService, ChatGateway],
  exports: [ChatService],
})
export class ChatModule {}
