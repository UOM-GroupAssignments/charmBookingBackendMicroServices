import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import {
  getConfig,
  loadAllSecrets,
  initializeEncryptionKey,
} from '@charmbooking/common';
import { RpcToHttpFilter } from './rcp-exception-filter';
import { RpcErrorInterceptor } from './rcp-interceptor';

async function bootstrap() {
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
  const app = await NestFactory.create(AppModule);
  app.useGlobalFilters(new RpcToHttpFilter());
  app.useGlobalInterceptors(new RpcErrorInterceptor());
  app.enableCors();
  await app.listen(config.services.apiGateway.port);
}
bootstrap();
