import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { User } from './user.entity';
import { Consultant } from './consultant.entity';
import { Message } from './message.entity';

@Entity('consultations')
export class Consultation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  clientId: string;

  @Column('uuid')
  consultantId: string;

  @Column({ enum: ['scheduled', 'active', 'completed', 'cancelled'], default: 'scheduled' })
  status: string;

  // 'chat' | 'voice' | 'video' — tipo da chamada, define qual preço foi cobrado.
  @Column({ type: 'varchar', length: 16, default: 'chat' })
  kind: string;

  // Preço por minuto vigente no instante em que a consulta foi iniciada.
  // Congela o valor pra proteger billing contra mudanças de preço durante a chamada.
  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  priceSnapshot: number | null;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  minutesUsed: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  creditsUsed: number;

  @Column({ nullable: true })
  scheduledFor: Date;

  @Column({ nullable: true })
  startedAt: Date;

  @Column({ nullable: true })
  endedAt: Date;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => User, (user) => user.consultations)
  @JoinColumn({ name: 'clientId' })
  client: User;

  @ManyToOne(() => Consultant, (consultant) => consultant.consultations)
  @JoinColumn({ name: 'consultantId' })
  consultant: Consultant;

  @OneToMany(() => Message, (message) => message.consultation)
  messages: Message[];
}
