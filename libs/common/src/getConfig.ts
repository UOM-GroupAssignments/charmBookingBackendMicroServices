import { config } from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

/**
 * @deprecated Use ConfigService from ConfigModule instead
 * This is kept for backward compatibility with scripts that run outside NestJS context
 */

// Try multiple possible locations for .env
const possiblePaths = [
  path.resolve(process.cwd(), '.env'),
  path.resolve(process.cwd(), '../.env'),
  path.resolve(process.cwd(), '../../.env'),
  path.resolve(__dirname, '../../../.env'),
];

const envPath = possiblePaths.find((p) => fs.existsSync(p));
if (envPath) {
  console.log(`Loading .env from: ${envPath}`);
  config({ path: envPath });
} else {
  console.warn('No .env file found! Using default environment variables.');
  config();
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
 * Get application configuration from environment variables
 * @deprecated Use ConfigService from ConfigModule instead
 */
export const getConfig = (): AppConfig => {
  const certBasePath = path.resolve(__dirname, '../../../cert');
  const tlsEnabled = process.env.TLS_ENABLED === 'true';

  const appConfig: AppConfig = {
    database: {
      host: process.env.DB_HOST || '',
      port: parseInt(process.env.DB_PORT || '3306', 10),
      username: process.env.DB_USERNAME || '',
      password: process.env.DB_PASSWORD || '',
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
      secret: process.env.JWT_SECRET || '',
      expiration: process.env.JWT_EXPIRATION || '',
    },
    payHere: {
      merchantId: process.env.PH_MERCHANT_ID || '',
      merchantSecret: process.env.PH_MERCHANT_SECRET || '',
      appId: process.env.PH_APP_ID || '',
      appSecret: process.env.PH_APP_SECRET || '',
      frontendUrl: process.env.FRONTEND_URL || '',
      backendUrl: process.env.BACKEND_URL || '',
    },
    tls: {
      enabled: tlsEnabled,
      certPath: path.join(certBasePath, 'service-cert.pem'),
      keyPath: path.join(certBasePath, 'service-key.pem'),
      caPath: path.join(certBasePath, 'ca-cert.pem'),
    },
  };

  return appConfig;
};
