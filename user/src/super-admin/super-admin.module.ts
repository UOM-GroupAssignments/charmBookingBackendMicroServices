import { Module } from '@nestjs/common';
import { SuperAdminController } from './super-admin.controller';
import { SuperAdminService } from './super-admin.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  ConfigService,
  Salon,
  SalonDetails,
  SalonDocuments,
  SuperAdmin,
} from '@charmbooking/common';
import { JwtModule } from '@nestjs/jwt';

@Module({
  imports: [
    TypeOrmModule.forFeature([SalonDetails, SuperAdmin, Salon, SalonDocuments]),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.jwt.secret,
        signOptions: { expiresIn: configService.jwt.expiration },
      }),
    }),
  ],

  controllers: [SuperAdminController],
  providers: [SuperAdminService],
})
export class SuperAdminModule {}
