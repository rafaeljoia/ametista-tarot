import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

/**
 * Pedido de serviço extra ofertado ao cliente após o atendimento.
 * Hoje só existe `kind = 'blessing'` (banhos / orações enviados por email).
 * Cobrado direto do saldo de créditos do cliente no instante do "Sim".
 */
@Entity('service_orders')
@Index(['clientId'])
@Index(['consultantId'])
@Index(['consultationId'])
export class ServiceOrder {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', nullable: true })
  consultationId: string | null;

  @Column({ type: 'uuid' })
  clientId: string;

  @Column({ type: 'varchar', length: 200 })
  clientName: string;

  @Column({ type: 'varchar', length: 320 })
  clientEmail: string;

  @Column({ type: 'uuid' })
  consultantId: string;

  @Column({ type: 'varchar', length: 200 })
  consultantName: string;

  @Column({ type: 'varchar', length: 320, nullable: true })
  consultantEmail: string | null;

  // 'bath' (banho) | 'prayer' (oração) | 'blessing' (legado, post-call genérico)
  @Column({ type: 'varchar', length: 32, default: 'blessing' })
  kind: string;

  // Valor cobrado em créditos (1 crédito = 1 BRL na convenção atual).
  @Column({ type: 'decimal', precision: 10, scale: 2 })
  priceCredits: number;

  // 'pending' (pago, aguarda entrega) | 'delivered' (consultor enviou) | 'expired' (passou prazo, reembolsado) | 'sent' (legado) | 'cancelled'
  @Column({ type: 'varchar', length: 16, default: 'pending' })
  status: string;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Column({ type: 'text', nullable: true })
  requestMessage: string | null;

  @Column({ type: 'text', nullable: true })
  deliveryText: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  deadlineAt: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  deliveredAt: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  sentAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
