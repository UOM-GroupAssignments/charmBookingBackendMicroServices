import { config } from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';
import { getSecret } from './keyVault';

// Try multiple possible locations for .env
const possiblePaths = [
  path.resolve(process.cwd(), '.env'), // Current directory
  path.resolve(process.cwd(), '../.env'), // Parent directory
  path.resolve(process.cwd(), '../../.env'), // Grandparent directory
  path.resolve(__dirname, '../../../.env'), // Relative to this file
];

// Find the first path that exists
const envPath = possiblePaths.find((p) => fs.existsSync(p));

if (envPath) {
  console.log(`Loading .env from: ${envPath}`);
  config({ path: envPath });
} else {
  console.warn('No .env file found! Using default environment variables.');
  config(); // Try to load from process.env anyway
}

type DatabaseConfig = {
  host: string;
  port: number;
  username: string;
  password: string;
};

type ServiceConfig = {
  apiGateway: { port: number };
  booking: { host: string; port: number };
  user: { host: string; port: number };
};

type JwtConfig = {
  secret: string;
  expiration: string;
};

type PayHereConfig = {
  merchantId: string;
  merchantSecret: string;
  appId: string;
  appSecret: string;
  frontendUrl: string;
  backendUrl: string;
};

type TlsConfig = {
  enabled: boolean;
  certPath: string;
  keyPath: string;
  caPath: string;
};

type AppConfig = {
  database: DatabaseConfig;
  services: ServiceConfig;
  jwt: JwtConfig;
  payHere: PayHereConfig;
  tls: TlsConfig;
};

/**
 * Validate that all required configuration values are present
 * Throws an error with details about missing values
 * Implements Fail-Fast validation to prevent security vulnerabilities
 */
const validateConfig = (config: AppConfig): void => {
  const missing: string[] = [];
  const critical: string[] = [];

  // Check database config
  if (!config.database.host) missing.push('DB_HOST');
  if (!config.database.username) missing.push('DB_USERNAME');
  if (!config.database.password) missing.push('DB_PASSWORD');

  // Check JWT config - CRITICAL for security
  if (!config.jwt.secret) {
    missing.push('JWT_SECRET');
    critical.push('JWT_SECRET');
  }
  if (!config.jwt.expiration) missing.push('JWT_EXPIRATION');

  // Check PayHere config
  if (!config.payHere.merchantId) missing.push('PH_MERCHANT_ID');
  if (!config.payHere.merchantSecret) missing.push('PH_MERCHANT_SECRET');
  if (!config.payHere.appId) missing.push('PH_APP_ID');
  if (!config.payHere.appSecret) missing.push('PH_APP_SECRET');
  if (!config.payHere.frontendUrl) missing.push('FRONTEND_URL');
  if (!config.payHere.backendUrl) missing.push('BACKEND_URL');

  if (missing.length > 0) {
    const errorMessage = [
      '',
      '╔════════════════════════════════════════════════════════════════╗',
      '║  CONFIGURATION ERROR: Missing Required Secrets                 ║',
      '╚════════════════════════════════════════════════════════════════╝',
      '',
      ...(critical.length > 0
        ? [
            '⚠️  CRITICAL SECURITY SECRETS MISSING:',
            ...critical.map(
              (key) => `  ✗ ${key} (REQUIRED FOR AUTHENTICATION)`,
            ),
            '',
          ]
        : []),
      'The following required configuration values are missing:',
      ...missing.map((key) => `  ✗ ${key}`),
      '',
      'These secrets must be provided via:',
      '  1. Azure Key Vault (recommended): Add secrets with names like "DB-HOST"',
      '  2. Environment variables: Set in .env file or system environment',
      '',
      'Please ensure all required secrets are configured before starting the application.',
      '',
    ].join('\n');

    throw new Error(errorMessage);
  }

  // Additional validation: JWT secret must be strong enough
  if (config.jwt.secret.length < 32) {
    throw new Error(
      '╔════════════════════════════════════════════════════════════════╗\n' +
        '║  SECURITY ERROR: Weak JWT Secret                               ║\n' +
        '╚════════════════════════════════════════════════════════════════╝\n\n' +
        '⚠️  JWT_SECRET is too weak!\n\n' +
        `Current length: ${config.jwt.secret.length} characters\n` +
        'Required length: At least 32 characters\n\n' +
        'A weak JWT secret allows attackers to forge authentication tokens,\n' +
        'leading to complete authentication bypass.\n\n' +
        'Please generate a strong secret using:\n' +
        "  node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\"\n",
    );
  }

  // Validate TLS certificates if TLS is enabled
  if (config.tls.enabled) {
    const tlsMissing: string[] = [];

    if (!fs.existsSync(config.tls.certPath)) {
      tlsMissing.push(`TLS Certificate not found: ${config.tls.certPath}`);
    }
    if (!fs.existsSync(config.tls.keyPath)) {
      tlsMissing.push(`TLS Key not found: ${config.tls.keyPath}`);
    }
    if (!fs.existsSync(config.tls.caPath)) {
      tlsMissing.push(`TLS CA Certificate not found: ${config.tls.caPath}`);
    }

    if (tlsMissing.length > 0) {
      throw new Error(
        '╔════════════════════════════════════════════════════════════════╗\n' +
          '║  SECURITY ERROR: TLS Certificates Missing                     ║\n' +
          '╚════════════════════════════════════════════════════════════════╝\n\n' +
          '⚠️  TLS is enabled but certificates are missing!\n\n' +
          tlsMissing.map((msg) => `  ✗ ${msg}`).join('\n') +
          '\n\nPlease generate TLS certificates or set TLS_ENABLED=false\n',
      );
    }
  }
};

/**
 * Get application configuration from Azure Key Vault or environment variables
 * Priority: Azure Key Vault > Environment variables
 *
 * @param validate - If true (default), validates that all required secrets are present
 * @returns Application configuration
 * @throws Error if validation is enabled and required secrets are missing
 */
export const getConfig = (validate: boolean = true): AppConfig => {
  // Determine certificate paths
  const certBasePath = path.resolve(__dirname, '../../../cert');
  const tlsEnabled = getSecret('TLS_ENABLED') === 'true';

  const appConfig: AppConfig = {
    database: {
      host: getSecret('DB_HOST') || '',
      port: parseInt(getSecret('DB_PORT') || '3306', 10),
      username: getSecret('DB_USERNAME') || '',
      password: getSecret('DB_PASSWORD') || '',
    },
    services: {
      apiGateway: {
        port: parseInt(getSecret('API_GATEWAY_PORT') || '3000', 10),
      },
      booking: {
        host: getSecret('BOOKING_SERVICE_HOST') || 'localhost',
        port: parseInt(getSecret('BOOKING_SERVICE_PORT') || '3001', 10),
      },
      user: {
        host: getSecret('USER_SERVICE_HOST') || 'localhost',
        port: parseInt(getSecret('USER_SERVICE_PORT') || '3002', 10),
      },
    },
    jwt: {
      secret: getSecret('JWT_SECRET') || '',
      expiration: getSecret('JWT_EXPIRATION') || '',
    },
    payHere: {
      merchantId: getSecret('PH_MERCHANT_ID') || '',
      merchantSecret: getSecret('PH_MERCHANT_SECRET') || '',
      appId: getSecret('PH_APP_ID') || '',
      appSecret: getSecret('PH_APP_SECRET') || '',
      frontendUrl: getSecret('FRONTEND_URL') || '',
      backendUrl: getSecret('BACKEND_URL') || '',
    },
    tls: {
      enabled: tlsEnabled,
      certPath: path.join(certBasePath, 'service-cert.pem'),
      keyPath: path.join(certBasePath, 'service-key.pem'),
      caPath: path.join(certBasePath, 'ca-cert.pem'),
    },
  };

  if (validate) {
    validateConfig(appConfig);
  }

  return appConfig;
};
