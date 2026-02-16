import { Injectable } from '@nestjs/common';
import { ConfigService as NestConfigService } from '@nestjs/config';

/**
 * Type definitions for the configuration structure
 */
export interface DatabaseConfig {
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
}

export interface ApiGatewayConfig {
  port: number;
}

export interface BookingServiceConfig {
  host: string;
  port: number;
}

export interface UserServiceConfig {
  host: string;
  port: number;
}

export interface ServicesConfig {
  apiGateway: ApiGatewayConfig;
  booking: BookingServiceConfig;
  user: UserServiceConfig;
}

export interface JwtConfig {
  secret: string;
  expiration: string;
}

export interface PayHereConfig {
  merchantId: string;
  merchantSecret: string;
  appId: string;
  appSecret: string;
  frontendUrl: string;
  backendUrl: string;
}

export interface TlsConfig {
  enabled: boolean;
  certPath: string;
  keyPath: string;
  caPath: string;
}

export interface EncryptionConfig {
  fieldEncryptionKey: string;
}

export interface AppConfig {
  database: DatabaseConfig;
  services: ServicesConfig;
  jwt: JwtConfig;
  payHere: PayHereConfig;
  tls: TlsConfig;
  encryption: EncryptionConfig;
}

/**
 * Wrapper service for NestJS ConfigService with type-safe dot notation access
 *
 * @example
 * ```typescript
 * constructor(private readonly config: ConfigService) {}
 *
 * // Access nested config values using dot notation
 * const dbHost = this.config.get('database.host');
 * const jwtSecret = this.config.get('jwt.secret');
 * const apiPort = this.config.get('services.apiGateway.port');
 *
 * // Or use strongly-typed property accessors
 * const dbConfig = this.config.database;
 * const jwtConfig = this.config.jwt;
 * ```
 */
@Injectable()
export class ConfigService {
  constructor(private configService: NestConfigService<AppConfig>) {}

  // Convenience methods for strongly-typed access to top-level config sections

  /**
   * Get the complete database configuration
   */
  get database(): DatabaseConfig {
    return this.configService.get<DatabaseConfig>('database')!;
  }

  /**
   * Get the complete services configuration
   */
  get services(): ServicesConfig {
    return this.configService.get<ServicesConfig>('services')!;
  }

  /**
   * Get the complete JWT configuration
   */
  get jwt(): JwtConfig {
    return this.configService.get<JwtConfig>('jwt')!;
  }

  /**
   * Get the complete PayHere configuration
   */
  get payHere(): PayHereConfig {
    return this.configService.get<PayHereConfig>('payHere')!;
  }

  /**
   * Get the complete TLS configuration
   */
  get tls(): TlsConfig {
    return this.configService.get<TlsConfig>('tls')!;
  }

  /**
   * Get the complete encryption configuration
   */
  get encryption(): EncryptionConfig {
    return this.configService.get<EncryptionConfig>('encryption')!;
  }

  /**
   * Get the entire configuration object
   */
  get all(): AppConfig {
    return {
      database: this.database,
      services: this.services,
      jwt: this.jwt,
      payHere: this.payHere,
      tls: this.tls,
      encryption: this.encryption,
    };
  }
}
