import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Consultant } from './consultant.entity';
import { Consultation } from './consultation.entity';

@Entity('consultant_earnings')
export class ConsultantEarning {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column('uuid')
  consultantId: string;

  // One earning record per consultation — protects against duplicate inserts
  // under concurrent endConsultation() calls.
  @Index({ unique: true })
  @Column('uuid')
  consultationId: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  grossAmount: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 50 })
  commissionPercent: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  consultantAmount: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  platformAmount: number;

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => Consultant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'consultantId' })
  consultant: Consultant;

  @ManyToOne(() => Consultation, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'consultationId' })
  consultation: Consultation;
}
