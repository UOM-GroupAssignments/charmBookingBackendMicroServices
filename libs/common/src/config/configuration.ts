import { SecretClient } from '@azure/keyvault-secrets';
import { DefaultAzureCredential } from '@azure/identity';
import * as path from 'path';

/**
 * Configuration loader for NestJS ConfigModule
 * Loads secrets from Azure Key Vault in production, uses process.env in development
 */
export default async () => {
  const certBasePath = path.resolve('../', 'cert');

  // Production: Load secrets from Azure Key Vault
  const vaultUrl = process.env.AZURE_KEY_VAULT_URL;
  if (!vaultUrl) {
    throw new Error(
      'AZURE_KEY_VAULT_URL is required in production environment',
    );
  }

  console.log('Loading secrets from Azure Key Vault...');
  const client = new SecretClient(vaultUrl, new DefaultAzureCredential());

  try {
    // Fetch only sensitive secrets in parallel for better performance
    const [
      dbPassword,
      jwtSecret,
      phMerchantId,
      phMerchantSecret,
      phAppId,
      phAppSecret,
      fieldEncryptionKey,
    ] = await Promise.all([
      client
        .getSecret('DB-PASSWORD')
        .catch(() => ({ value: process.env.DB_PASSWORD })),
      client
        .getSecret('JWT-SECRET')
        .catch(() => ({ value: process.env.JWT_SECRET })),
      client
        .getSecret('PH-MERCHANT-ID')
        .catch(() => ({ value: process.env.PH_MERCHANT_ID })),
      client
        .getSecret('PH-MERCHANT-SECRET')
        .catch(() => ({ value: process.env.PH_MERCHANT_SECRET })),
      client
        .getSecret('PH-APP-ID')
        .catch(() => ({ value: process.env.PH_APP_ID })),
      client
        .getSecret('PH-APP-SECRET')
        .catch(() => ({ value: process.env.PH_APP_SECRET })),
      client
        .getSecret('FIELD-ENCRYPTION-KEY')
        .catch(() => ({ value: process.env.FIELD_ENCRYPTION_KEY })),
    ]);

    console.log('✓ Successfully loaded secrets from Azure Key Vault');

    return {
      database: {
        host: process.env.DB_HOST,
        port: parseInt(process.env.DB_PORT || '3306', 10),
        username: process.env.DB_USERNAME,
        password: dbPassword.value,
        database: 'charmbooking',
      },
      services: {
        apiGateway: {
          port: parseInt(process.env.API_GATEWAY_PORT || '3000', 10),
        },
        booking: {
          host: process.env.BOOKING_SERVICE_HOST || 'localhost',
          port: parseInt(process.env.BOOKING_SERVICE_PORT || '3001', 10),
        },
        user: {
          host: process.env.USER_SERVICE_HOST || 'localhost',
          port: parseInt(process.env.USER_SERVICE_PORT || '3002', 10),
        },
      },
      jwt: {
        secret: jwtSecret.value,
        expiration: process.env.JWT_EXPIRATION || '1h',
      },
      payHere: {
        merchantId: phMerchantId.value,
        merchantSecret: phMerchantSecret.value,
        appId: phAppId.value,
        appSecret: phAppSecret.value,
        frontendUrl: process.env.FRONTEND_URL,
        backendUrl: process.env.BACKEND_URL,
      },
      tls: {
        enabled: process.env.TLS_ENABLED === 'true',
        certPath: path.join(certBasePath, 'service-cert.pem'),
        keyPath: path.join(certBasePath, 'service-key.pem'),
        caPath: path.join(certBasePath, 'ca-cert.pem'),
      },
      encryption: {
        fieldEncryptionKey: fieldEncryptionKey.value,
      },
    };
  } catch (error) {
    console.error(
      'Failed to load secrets from Azure Key Vault:',
      error instanceof Error ? error.message : 'Unknown error',
    );
    throw error;
  }
};
