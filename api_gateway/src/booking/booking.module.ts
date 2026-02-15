import { Module } from '@nestjs/common';
import { BookingController } from './booking.controller';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { SalonServiceController } from './salon_service.controller';
import { SalonController } from './salon.controller';
import { SalonCategoryController } from './salon_category.controller';
import { JwtModule } from '@nestjs/jwt/dist/jwt.module';
import { getConfig } from '@charmbooking/common';
import { SalonWorkerController } from './salon_worker.controller';
import { PaymentsController } from './payment.controller';
import * as fs from 'fs';

const config = getConfig();

// Prepare client configuration options
interface TcpOptions {
  host: string;
  port: number;
  tlsOptions?: {
    key: Buffer;
    cert: Buffer;
    ca: Buffer;
    rejectUnauthorized: boolean;
  };
}

const bookingServiceOptions: TcpOptions = {
  host: 'localhost',
  port: config.services.booking.port,
};

// Add TLS configuration if enabled
if (config.tls.enabled) {
  bookingServiceOptions.tlsOptions = {
    key: fs.readFileSync(config.tls.keyPath),
    cert: fs.readFileSync(config.tls.certPath),
    ca: fs.readFileSync(config.tls.caPath),
    rejectUnauthorized: true,
  };
}

@Module({
  imports: [
    ClientsModule.register([
      {
        name: 'BOOKING_SERVICE',
        transport: Transport.TCP,
        options: bookingServiceOptions,
      },
    ]),
    JwtModule.register({
      secret: config.jwt.secret,
      signOptions: { expiresIn: '1d' },
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
