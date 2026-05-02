import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
  Unique,
} from 'typeorm';

export type AvailabilityAlertStatus = 'pending' | 'notified' | 'cancelled';

@Entity('consultant_availability_alerts')
@Unique('uniq_user_consultant_pending', ['userId', 'consultantId', 'status'])
export class ConsultantAvailabilityAlert {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column('uuid')
  userId: string;

  @Index()
  @Column('uuid')
  consultantId: string;

  @Column({
    type: 'varchar',
    length: 16,
    default: 'pending',
  })
  status: AvailabilityAlertStatus;

  @CreateDateColumn()
  createdAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  notifiedAt: Date | null;
}
