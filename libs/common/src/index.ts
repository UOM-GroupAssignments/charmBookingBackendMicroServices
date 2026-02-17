export { dataSource } from './data-source';
export { CommonModule } from './common.module';
export { ConfigModule } from './config.module';
export { ConfigService } from './config.service';
export type {
  DatabaseConfig,
  ServicesConfig,
  ApiGatewayConfig,
  BookingServiceConfig,
  UserServiceConfig,
  JwtConfig,
  PayHereConfig,
  TlsConfig,
  EncryptionConfig,
  AppConfig,
} from './config.service';

export { validate } from './config/validation';

// Legacy function-based exports (backward compatibility)
export { getConfig } from './getConfig';
export {
  initializeKeyVault,
  getSecret,
  getRequiredSecret,
  isKeyVaultInitialized,
  getLoadedSecretNames,
} from './keyVault';

export {
  initializeEncryptionKey,
  encryptField,
  decryptField,
  encryptionTransformer,
  generateEncryptionKey,
} from './encryption/fieldEncryption';
export { GenericError, GenericErrorResponse } from './errors/genericError';
export { TimeString } from './helpers/timeString';
export { calcLatLongDistance } from './helpers/distanceHelpers';
export * from './enums';
export * from './entities';
export * from './dto';
export { maskBankAccountNumber } from './utils/mask.utils';
