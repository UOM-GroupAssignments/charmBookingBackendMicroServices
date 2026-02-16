import * as crypto from 'crypto';
import { ConfigService } from '../config.service';

/**
 * Field-Level Encryption (FLE) utility for sensitive data
 * Uses AES-256-GCM algorithm with keys managed by Azure Key Vault
 */

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16; // For AES, this is always 16 bytes
const KEY_LENGTH = 32; // 256 bits

let encryptionKey: Buffer | null = null;

/**
 * Initialize encryption key from Key Vault
 * The key should be stored in Key Vault as "FIELD_ENCRYPTION_KEY"
 * Expected format: 64 character hex string (32 bytes = 256 bits)
 *
 * @param configService - Optional ConfigService instance. If provided, uses injectable service; otherwise uses legacy getRequiredSecret
 */
export const initializeEncryptionKey = (configService: ConfigService): void => {
  try {
    const keyHex = configService.encryption.fieldEncryptionKey;

    if (!keyHex) {
      throw new Error('Encryption key not found in configuration');
    }

    // Validate key format
    if (!/^[0-9a-fA-F]{64}$/.test(keyHex)) {
      throw new Error(
        'Invalid encryption key format. Expected 64 character hex string.',
      );
    }

    encryptionKey = Buffer.from(keyHex, 'hex');
    console.log('✓ Field encryption key initialized from Key Vault');
  } catch (error) {
    console.error('Failed to initialize encryption key:', error);
    throw new Error(
      `Encryption key initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
    );
  }
};

/**
 * Get or initialize encryption key
 */
const getEncryptionKey = (): Buffer => {
  if (!encryptionKey) {
    throw new Error('Encryption key not initialized');
  }
  return encryptionKey;
};

/**
 * Encrypt a string value using AES-256-GCM
 * @param plaintext - The value to encrypt
 * @returns Encrypted value in format: iv:authTag:ciphertext (all hex encoded)
 */
export const encryptField = (
  plaintext: string | null | undefined,
): string | null => {
  if (plaintext === null || plaintext === undefined || plaintext === '') {
    return null;
  }

  try {
    const key = getEncryptionKey();
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag();

    // Format: iv:authTag:ciphertext
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
  } catch (error) {
    console.error('Encryption failed:', error);
    throw new Error(
      `Field encryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
    );
  }
};

/**
 * Decrypt a string value encrypted with encryptField
 * @param encryptedValue - The encrypted value in format: iv:authTag:ciphertext
 * @returns Decrypted plaintext value
 */
export const decryptField = (
  encryptedValue: string | null | undefined,
): string | null => {
  if (
    encryptedValue === null ||
    encryptedValue === undefined ||
    encryptedValue === ''
  ) {
    return null;
  }

  try {
    const key = getEncryptionKey();
    const parts = encryptedValue.split(':');

    if (parts.length !== 3) {
      throw new Error('Invalid encrypted value format');
    }

    const [ivHex, authTagHex, ciphertext] = parts;
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(ciphertext, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (error) {
    console.error('Decryption failed:', error);
    throw new Error(
      `Field decryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
    );
  }
};

/**
 * TypeORM transformer for automatic encryption/decryption
 * Use this in @Column decorator: @Column({ transformer: encryptionTransformer })
 */
export const encryptionTransformer = {
  to: (value: string | null | undefined): string | null => {
    return encryptField(value);
  },
  from: (value: string | null | undefined): string | null => {
    return decryptField(value);
  },
};

/**
 * Generate a new encryption key (for initial setup)
 * This should be run once and the output should be stored in Key Vault
 * @returns A 64-character hex string representing a 256-bit key
 */
export const generateEncryptionKey = (): string => {
  return crypto.randomBytes(KEY_LENGTH).toString('hex');
};
