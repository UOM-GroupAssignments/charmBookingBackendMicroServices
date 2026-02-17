import { Module } from '@nestjs/common';
import { BookingController } from './booking.controller';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { SalonServiceController } from './salon_service.controller';
import { SalonController } from './salon.controller';
import { SalonCategoryController } from './salon_category.controller';
import { JwtModule } from '@nestjs/jwt/dist/jwt.module';
import { ConfigModule, ConfigService } from '@charmbooking/common';
import { SalonWorkerController } from './salon_worker.controller';
import { PaymentsController } from './payment.controller';
import * as fs from 'fs';
import { FileUploadModule } from '../file-upload/file-upload.module';

@Module({
  imports: [
    ConfigModule,
    FileUploadModule,
    ClientsModule.registerAsync([
      {
        name: 'BOOKING_SERVICE',
        imports: [ConfigModule],
        inject: [ConfigService],
        useFactory: (configService: ConfigService) => {
          const options = {
            host: configService.services.booking.host,
            port: configService.services.booking.port,
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
  controllers: [
    BookingController,
    SalonServiceController,
    SalonController,
    SalonCategoryController,
    SalonWorkerController,
    PaymentsController,
  ],
})
export class BookingModule {}
