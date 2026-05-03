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

  @Column({ type: 'uuid' })
  consultationId: string;

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

  // Hoje: 'blessing' (banhos/orações). Futuramente outros tipos.
  @Column({ type: 'varchar', length: 32, default: 'blessing' })
  kind: string;

  // Valor cobrado em créditos (1 crédito = 1 BRL na convenção atual).
  @Column({ type: 'decimal', precision: 10, scale: 2 })
  priceCredits: number;

  // 'pending' (pago, aguarda envio do consultor) | 'sent' (consultor marcou como enviado) | 'cancelled'
  @Column({ type: 'varchar', length: 16, default: 'pending' })
  status: string;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  sentAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
