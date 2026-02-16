import { Module } from '@nestjs/common';
import { UserController } from './user.controller';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { SuperAdminController } from './super-admin.controller';
import { JwtModule } from '@nestjs/jwt/dist/jwt.module';
import { ConfigModule, ConfigService } from '@charmbooking/common';
import * as fs from 'fs';

@Module({
  imports: [
    ConfigModule,
    ClientsModule.registerAsync([
      {
        name: 'USER_SERVICE',
        imports: [ConfigModule],
        inject: [ConfigService],
        useFactory: (configService: ConfigService) => {
          const options = {
            host: configService.services.user.host,
            port: configService.services.user.port,
          };

          // Add TLS configuration if enabled
          if (configService.tls.enabled) {
            return {
              transport: Transport.TCP,
              options: {
                ...options,
                tlsOptions: {
                  key: fs.readFileSync(configService.tls.keyPath),
                  cert: fs.readFileSync(configService.tls.certPath),
                  ca: fs.readFileSync(configService.tls.caPath),
                  rejectUnauthorized: true,
                },
              },
            };
          }

          return {
            transport: Transport.TCP,
            options,
          };
        },
      },
    ]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.jwt.secret,
        signOptions: { expiresIn: '1d' },
      }),
    }),
  ],
  controllers: [UserController, SuperAdminController],
})
export class UserModule {}
