import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('password_reset_tokens')
@Index(['userId'])
@Index(['tokenHash'])
export class PasswordResetToken {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // role = 'user' (cliente) | 'consultant' (consultor) — só esses 2 redefinem por email
  @Column({ type: 'varchar', length: 20 })
  role: string;

  @Column({ type: 'uuid' })
  userId: string;

  @Column({ type: 'varchar', length: 320 })
  email: string;

  // sha256 do token bruto (não armazenamos o token em claro)
  @Column({ type: 'varchar', length: 128 })
  tokenHash: string;

  @Column({ type: 'timestamptz' })
  expiresAt: Date;

  @Column({ type: 'timestamptz', nullable: true })
  usedAt: Date | null;

  @Column({ type: 'varchar', length: 64, nullable: true })
  requestedFromIp: string | null;

  @CreateDateColumn()
  createdAt: Date;
}
