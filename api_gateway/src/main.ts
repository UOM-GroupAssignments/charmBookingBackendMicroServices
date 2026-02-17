import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService, initializeEncryptionKey } from '@charmbooking/common';
import { RpcToHttpFilter } from './rcp-exception-filter';
import { RpcErrorInterceptor } from './rcp-interceptor';
// import * as fs from 'fs';

async function bootstrap() {
  // const httpsOptions = {
  //   key: fs.readFileSync('./secrets/private-key.pem'),
  //   cert: fs.readFileSync('./secrets/public-certificate.pem'),
  // };
  const app = await NestFactory.create(AppModule, {
    // httpsOptions,
  });
  const configService = app.get(ConfigService);

  // Initialize encryption key using ConfigService
  try {
    initializeEncryptionKey(configService);
    console.log('✓ Field encryption initialized');
  } catch (error) {
    console.error('Failed to initialize encryption:', error);
    process.exit(1);
  }

  const port = configService.services.apiGateway.port;

  app.useGlobalFilters(new RpcToHttpFilter());
  app.useGlobalInterceptors(new RpcErrorInterceptor());
  app.enableCors();

  await app.listen(port);
  console.log(`✓ API Gateway running on port ${port}`);
}
bootstrap().catch((err) => {
  console.error('Failed to start API Gateway:', err);
  process.exit(1);
});
