import { Module } from '@nestjs/common';
import { UserController } from './user.controller';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { SuperAdminController } from './super-admin.controller';
import { JwtModule } from '@nestjs/jwt/dist/jwt.module';
import { getConfig } from '@charmbooking/common';
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

const userServiceOptions: TcpOptions = {
  host: 'localhost',
  port: config.services.user.port,
};

// Add TLS configuration if enabled
if (config.tls.enabled) {
  userServiceOptions.tlsOptions = {
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
        name: 'USER_SERVICE',
        transport: Transport.TCP,
        options: userServiceOptions,
      },
    ]),
    JwtModule.register({
      secret: config.jwt.secret,
      signOptions: { expiresIn: '1d' },
    }),
  ],
  controllers: [UserController, SuperAdminController],
})
export class UserModule {}
