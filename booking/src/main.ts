import { NestFactory } from '@nestjs/core';
import { Transport, MicroserviceOptions } from '@nestjs/microservices';
import { AppModule } from './app.module';
import {
  getConfig,
  loadAllSecrets,
  initializeEncryptionKey,
} from '@charmbooking/common';
import * as fs from 'fs';

async function bootstrap() {
  // Load secrets from Azure Key Vault before initializing the application
  try {
    await loadAllSecrets();
    console.log('✓ Secrets loaded successfully');
    initializeEncryptionKey();
    console.log('✓ Field encryption initialized');
  } catch (error) {
    console.error('Failed to load secrets:', error);
    process.exit(1);
  }

  // Get configuration (will validate that all required secrets are present)
  const config = getConfig();

  // Prepare microservice options
  const microserviceOptions: MicroserviceOptions = {
    transport: Transport.TCP,
    options: {
      host: 'localhost',
      port: config.services.booking.port,
    },
  };

  // Add TLS configuration if enabled
  if (config.tls.enabled) {
    microserviceOptions.options = {
      ...microserviceOptions.options,
      tlsOptions: {
        key: fs.readFileSync(config.tls.keyPath),
        cert: fs.readFileSync(config.tls.certPath),
        ca: fs.readFileSync(config.tls.caPath),
        requestCert: true,
        rejectUnauthorized: true,
      },
    };
    console.log('✓ TLS enabled for Booking service');
  }

  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    AppModule,
    microserviceOptions,
  );
  await app.listen();
  console.log(
    `✓ Booking service running on port ${config.services.booking.port}`,
  );
}
bootstrap().catch((err) => {
  console.error('Failed to start Booking service:', err);
  process.exit(1);
});
