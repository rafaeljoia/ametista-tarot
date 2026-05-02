import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from './user.entity';
import { Consultant } from './consultant.entity';
import { Consultation } from './consultation.entity';

export type MessageType = 'text' | 'image' | 'audio';

@Entity('messages')
export class Message {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  consultationId: string;

  @Column('uuid')
  senderId: string;

  @Column('uuid')
  recipientId: string;

  @Column({ type: 'text' })
  content: string;

  @Column({ enum: ['text', 'image', 'audio'], default: 'text' })
  type: MessageType;

  /**
   * URL pública da mídia anexada (imagens/áudio). Para mensagens 'text' fica null.
   */
  @Column({ type: 'text', nullable: true })
  mediaUrl: string | null;

  @Column({ default: false })
  isRead: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => Consultation, (consultation) => consultation.messages)
  @JoinColumn({ name: 'consultationId' })
  consultation: Consultation;

  @ManyToOne(() => User, (user) => user.messages)
  @JoinColumn({ name: 'senderId' })
  sender: User;

  @ManyToOne(() => Consultant)
  @JoinColumn({ name: 'recipientId' })
  recipient: Consultant;
}
