import { Entity, Column, PrimaryColumn } from 'typeorm';

@Entity()
export class SuperAdmin {
  @PrimaryColumn({ length: 100 })
  username: string;

  @Column({ length: 100 })
  password: string;

  @Column({ type: 'timestamp', nullable: true })
  lastLoginTime: Date | null;

  @Column({ default: 0 })
  loginFailedAttempts: number;

  @Column({ type: 'timestamp', nullable: true })
  lockedUntil: Date | null;
}
