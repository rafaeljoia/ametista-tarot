import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from './user.entity';

export type PaymentMethod = 'pix' | 'card';
export type TransactionStatus =
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'refunded'
  | 'cancelled';

@Entity('transactions')
export class Transaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column('uuid')
  userId: string;

  @Column()
  packageId: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  gross: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  net: number;

  @Column({ type: 'int' })
  creditsAmount: number;

  @Column({ type: 'varchar', length: 16 })
  method: PaymentMethod;

  @Index()
  @Column({ type: 'varchar', length: 16, default: 'pending' })
  status: TransactionStatus;

  // Mercado Pago payment id (or other gateway id). Indexed for fast lookup
  // from the webhook handler. Idempotency is enforced primarily by the
  // `creditedAt` guard + pessimistic lock in PaymentsService.applyApproval —
  // a partial unique index here would be ideal but TypeORM's `synchronize`
  // is unreliable for partial indexes across upgrades, so we keep it plain.
  @Index()
  @Column({ type: 'varchar', nullable: true })
  gatewayId: string | null;

  @Column({ type: 'jsonb', nullable: true })
  gatewayMeta: Record<string, any> | null;

  // Set once when credits are added to the user — guarantees idempotency
  // even if the webhook fires multiple times for the same transaction.
  @Column({ type: 'timestamptz', nullable: true })
  creditedAt: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  expiresAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;
}
