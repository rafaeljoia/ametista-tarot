import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  Check,
} from 'typeorm';
import { Consultation } from './consultation.entity';
import { User } from './user.entity';
import { Consultant } from './consultant.entity';

@Entity('reviews')
@Check(`"rating" >= 1 AND "rating" <= 5`)
export class Review {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // 1 review por consulta — protege contra duplicatas mesmo sob race.
  @Index({ unique: true })
  @Column('uuid')
  consultationId: string;

  @Index()
  @Column('uuid')
  clientId: string;

  @Index()
  @Column('uuid')
  consultantId: string;

  @Column({ type: 'int' })
  rating: number;

  @Column({ type: 'text', nullable: true })
  comment: string | null;

  @Index()
  @Column({ default: false })
  isHidden: boolean;

  @Column({ type: 'text', nullable: true })
  hiddenReason: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => Consultation, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'consultationId' })
  consultation: Consultation;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'clientId' })
  client: User;

  @ManyToOne(() => Consultant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'consultantId' })
  consultant: Consultant;
}
