import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { Consultation } from './consultation.entity';
import { Message } from './message.entity';

@Entity('consultants')
export class Consultant {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ unique: true })
  email: string;

  @Column()
  password: string;

  @Column()
  specialty: string;

  @Column({ type: 'text', nullable: true })
  bio: string;

  // URL pública do avatar do consultor (servida estaticamente em /api/uploads/avatars/...)
  // Editável APENAS pelo admin via POST /admin/consultants/:id/avatar.
  @Column({ type: 'text', nullable: true })
  avatarUrl: string | null;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 1.0 })
  pricePerMinute: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 50 })
  commissionPercent: number;

  @Column({ type: 'decimal', precision: 3, scale: 2, default: 5.0 })
  rating: number;

  @Column({ default: 0 })
  consultationsCount: number;

  @Column({ default: false })
  isAvailable: boolean;

  // Self-declared status set by the consultant from the dashboard.
  // - 'online'           : visible & accepting calls
  // - 'busy'             : visible but declines new calls; auto-logout after 20min
  // - 'in_consultation'  : auto-set by the chat gateway when a call is accepted
  // - 'offline'          : socket disconnected / forced logout
  @Column({ type: 'varchar', length: 32, default: 'offline' })
  availabilityStatus: 'online' | 'busy' | 'in_consultation' | 'offline';

  // Timestamp the consultant entered 'busy'. Cleared on any other transition.
  // Used by the cron to auto-flip busy → offline after 20 minutes.
  @Column({ type: 'timestamptz', nullable: true })
  busySince: Date | null;

  @Column({ nullable: true })
  availableFrom: Date;

  @Column({ nullable: true })
  availableUntil: Date;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => Consultation, (consultation) => consultation.consultant)
  consultations: Consultation[];

  @OneToMany(() => Message, (message) => message.recipient)
  messages: Message[];
}
