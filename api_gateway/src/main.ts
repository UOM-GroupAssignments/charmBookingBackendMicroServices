import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { getConfig, loadAllSecrets } from '@charmbooking/common';
import { RpcToHttpFilter } from './rcp-exception-filter';
import { RpcErrorInterceptor } from './rcp-interceptor';
import * as fs from 'fs';

async function bootstrap() {
  try {
    await loadAllSecrets();
    console.log('✓ Secrets loaded successfully');
  } catch (error) {
    console.error('Failed to load secrets:', error);
    process.exit(1);
  }

  // Get configuration (will validate that all required secrets are present)
  const config = getConfig();
  const httpsOptions = {
    key: fs.readFileSync('./secrets/private-key.pem'),
    cert: fs.readFileSync('./secrets/public-certificate.pem'),
  };

  const app = await NestFactory.create(AppModule, {
    httpsOptions,
  });
  app.useGlobalFilters(new RpcToHttpFilter());
  app.useGlobalInterceptors(new RpcErrorInterceptor());
  app.enableCors();
  await app.listen(config.services.apiGateway.port);
}
bootstrap();
