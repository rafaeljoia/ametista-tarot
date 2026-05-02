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
import { Admin } from './admin.entity';

@Entity('commission_payouts')
export class CommissionPayout {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column('uuid')
  consultantId: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount: number;

  @Column({ type: 'varchar', length: 80, nullable: true })
  reference: string | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Column('uuid', { nullable: true })
  paidByAdminId: string | null;

  @CreateDateColumn()
  paidAt: Date;

  @ManyToOne(() => Consultant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'consultantId' })
  consultant: Consultant;

  @ManyToOne(() => Admin, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'paidByAdminId' })
  paidByAdmin: Admin;
}
