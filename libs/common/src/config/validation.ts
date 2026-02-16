import { validate as csValidate, ValidationError } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { IsString, IsNotEmpty, IsOptional, IsNumber } from 'class-validator';

/**
 * Environment variables schema
 * NestJS will validate these at startup
 */
class EnvironmentVariables {
  // Database - Required
  @IsString()
  @IsNotEmpty()
  DB_HOST: string;

  @IsString()
  @IsNotEmpty()
  DB_USERNAME: string;

  @IsString()
  @IsNotEmpty()
  DB_PASSWORD: string;

  @IsNumber()
  @IsOptional()
  DB_PORT?: number = 3306;

  // JWT - Required
  @IsString()
  @IsNotEmpty()
  JWT_SECRET: string;

  @IsString()
  @IsOptional()
  JWT_EXPIRATION?: string = '1h';

  // PayHere - Required
  @IsString()
  @IsNotEmpty()
  PH_MERCHANT_ID: string;

  @IsString()
  @IsNotEmpty()
  PH_MERCHANT_SECRET: string;

  @IsString()
  @IsNotEmpty()
  PH_APP_ID: string;

  @IsString()
  @IsNotEmpty()
  PH_APP_SECRET: string;

  @IsString()
  @IsNotEmpty()
  FRONTEND_URL: string;

  @IsString()
  @IsNotEmpty()
  BACKEND_URL: string;

  // Encryption - Required
  @IsString()
  @IsNotEmpty()
  FIELD_ENCRYPTION_KEY: string;

  // Services - Optional with defaults
  @IsNumber()
  @IsOptional()
  API_GATEWAY_PORT?: number = 3000;

  @IsString()
  @IsOptional()
  BOOKING_SERVICE_HOST?: string = 'localhost';

  @IsNumber()
  @IsOptional()
  BOOKING_SERVICE_PORT?: number = 3001;

  @IsString()
  @IsOptional()
  USER_SERVICE_HOST?: string = 'localhost';

  @IsNumber()
  @IsOptional()
  USER_SERVICE_PORT?: number = 3002;

  // TLS - Optional
  @IsString()
  @IsOptional()
  TLS_ENABLED?: string = 'false';

  // Azure Key Vault - Optional
  @IsString()
  @IsOptional()
  AZURE_KEY_VAULT_URL?: string;
}

/**
 * Validate configuration
 * Called by NestJS ConfigModule at startup
 */
export async function validate(config: Record<string, unknown>) {
  await new Promise((resolve) => setTimeout(resolve, 20000));
  const validatedConfig = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });

  const errors = await csValidate(validatedConfig, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    const messages = errors.map((error: ValidationError) => {
      return `${error.property}: ${Object.values(error.constraints || {}).join(', ')}`;
    });
    throw new Error(`Configuration validation failed:\n${messages.join('\n')}`);
  }

  return validatedConfig;
}
