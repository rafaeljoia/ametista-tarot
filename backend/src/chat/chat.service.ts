import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Message } from '../database/entities/message.entity';
import { Consultation } from '../database/entities/consultation.entity';

@Injectable()
export class ChatService {
  constructor(
    @InjectRepository(Message)
    private messagesRepository: Repository<Message>,
    @InjectRepository(Consultation)
    private consultationsRepository: Repository<Consultation>,
  ) {}

  async saveMessage(
    consultationId: string,
    senderId: string,
    recipientId: string,
    content: string,
    type: 'text' | 'image' | 'audio' = 'text',
  ) {
    const message = this.messagesRepository.create({
      consultationId,
      senderId,
      recipientId,
      content,
      type,
    });

    return this.messagesRepository.save(message);
  }

  async getMessages(consultationId: string) {
    return this.messagesRepository.find({
      where: { consultationId },
      order: { createdAt: 'ASC' },
    });
  }

  async markAsRead(messageId: string) {
    await this.messagesRepository.update(messageId, { isRead: true });
  }

  async startConsultation(clientId: string, consultantId: string) {
    const consultation = this.consultationsRepository.create({
      clientId,
      consultantId,
      status: 'active',
      startedAt: new Date(),
    });

    return this.consultationsRepository.save(consultation);
  }

  async endConsultation(consultationId: string, minutesUsed: number, creditsUsed: number) {
    const consultation = await this.consultationsRepository.findOne({
      where: { id: consultationId },
    });

    if (consultation) {
      consultation.status = 'completed';
      consultation.endedAt = new Date();
      consultation.minutesUsed = minutesUsed;
      consultation.creditsUsed = creditsUsed;

      return this.consultationsRepository.save(consultation);
    }
  }
}
