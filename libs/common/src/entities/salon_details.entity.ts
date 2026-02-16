import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  PrimaryColumn,
} from 'typeorm';
import { Salon } from './salon.entity';
import { encryptionTransformer } from '../encryption/fieldEncryption';

@Entity()
export class SalonDetails {
  @PrimaryColumn()
  salonId: string;

  @ManyToOne(() => Salon, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'salonId' })
  salon: Salon;

  // Encrypted field: Owner's National Identity Card
  @Column({ length: 512, transformer: encryptionTransformer })
  owner_nic: string;

  // Encrypted field: Bank account holder's full name
  @Column({ length: 512, transformer: encryptionTransformer })
  bank_account_full_name: string;

  // Encrypted field: Bank account number
  @Column({ length: 512, transformer: encryptionTransformer })
  bank_account_number: string;

  @Column({ length: 255 })
  bank_name: string;

  @Column({ length: 255 })
  bank_branch: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
