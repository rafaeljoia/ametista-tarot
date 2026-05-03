import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('terms_versions')
export class TermsVersion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column({ type: 'int' })
  version: number;

  @Column({ type: 'text' })
  content: string;

  @Column({ type: 'boolean', default: false })
  isActive: boolean;

  @Column({ type: 'uuid', nullable: true })
  publishedBy: string | null;

  @Column({ type: 'varchar', length: 200, nullable: true })
  publishedByName: string | null;

  @CreateDateColumn()
  publishedAt: Date;
}
