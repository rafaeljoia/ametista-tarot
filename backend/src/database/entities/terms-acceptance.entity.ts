import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('terms_acceptances')
@Index(['userId'])
@Index(['termsVersionId'])
export class TermsAcceptance {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  userId: string;

  @Column({ type: 'varchar', length: 200, nullable: true })
  userName: string | null;

  @Column({ type: 'varchar', length: 320, nullable: true })
  userEmail: string | null;

  @Column({ type: 'uuid' })
  termsVersionId: string;

  @Column({ type: 'int' })
  termsVersion: number;

  @Column({ type: 'varchar', length: 64, nullable: true })
  ip: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  userAgent: string | null;

  @CreateDateColumn()
  acceptedAt: Date;
}
