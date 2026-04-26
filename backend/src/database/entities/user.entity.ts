import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { Credit } from './credit.entity';
import { Consultation } from './consultation.entity';
import { Message } from './message.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ unique: true })
  email: string;

  @Column()
  password: string;

  @Column({ nullable: true })
  phone: string;

  @Column({ nullable: true })
  birthDate: Date;

  @Column({ default: 0 })
  credits: number;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => Credit, (credit) => credit.user)
  credits_history: Credit[];

  @OneToMany(() => Consultation, (consultation) => consultation.client)
  consultations: Consultation[];

  @OneToMany(() => Message, (message) => message.sender)
  messages: Message[];
}
