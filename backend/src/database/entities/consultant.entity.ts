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
