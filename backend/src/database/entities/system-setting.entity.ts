import { Entity, PrimaryColumn, Column, UpdateDateColumn } from 'typeorm';

@Entity('system_settings')
export class SystemSetting {
  @PrimaryColumn({ type: 'varchar', length: 64 })
  key: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  value: string;

  @UpdateDateColumn()
  updatedAt: Date;
}
