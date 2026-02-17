import { NestFactory } from '@nestjs/core';
import { Transport, MicroserviceOptions } from '@nestjs/microservices';
import { AppModule } from './app.module';
import { ConfigService, initializeEncryptionKey } from '@charmbooking/common';
import * as fs from 'fs';

async function bootstrap() {
  // Create the microservice app first
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    AppModule,
    {
      transport: Transport.TCP,
      options: {
        host: 'localhost',
        port: 3002, // Temporary port, will be updated
      },
    },
  );

  // Get ConfigService from the DI container
  const configService = app.get(ConfigService);

  // Initialize encryption key using ConfigService
  try {
    initializeEncryptionKey(configService);
    console.log('✓ Field encryption initialized');
  } catch (error) {
    console.error('Failed to initialize encryption:', error);
    process.exit(1);
  }

  // Prepare microservice options with proper configuration
  const microserviceOptions: MicroserviceOptions = {
    transport: Transport.TCP,
    options: {
      host: 'localhost',
      port: configService.services.user.port,
    },
  };

  // Add TLS configuration if enabled
  if (configService.tls.enabled) {
    microserviceOptions.options = {
      ...microserviceOptions.options,
      tlsOptions: {
        key: fs.readFileSync(configService.tls.keyPath),
        cert: fs.readFileSync(configService.tls.certPath),
        ca: fs.readFileSync(configService.tls.caPath),
        requestCert: true,
        rejectUnauthorized: true,
      },
    };
    console.log('✓ TLS enabled for User service');
  }

  // Close the temporary app and recreate with proper configuration
  await app.close();
  const userApp = await NestFactory.createMicroservice<MicroserviceOptions>(
    AppModule,
    microserviceOptions,
  );
  await userApp.listen();
  console.log(
    `✓ User service running on port ${configService.services.user.port}`,
  );
}
bootstrap().catch((err) => {
  console.error('Failed to start User service:', err);
  process.exit(1);
});
