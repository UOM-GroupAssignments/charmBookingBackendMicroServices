import { Global, Module } from '@nestjs/common';
import { ConfigModule as NestConfigModule } from '@nestjs/config';
import configuration from './config/configuration';
import { ConfigService } from './config.service';

/**
 * Global configuration module that wraps NestJS ConfigModule
 * Provides ConfigService (wrapper) for type-safe dot notation access
 */
@Global()
@Module({
  imports: [
    NestConfigModule.forRoot({
      load: [configuration],
      isGlobal: true,
      cache: true,
    }),
  ],
  providers: [ConfigService],
  exports: [ConfigService],
})
export class ConfigModule {}
