import { Module } from '@nestjs/common';
import { SalonController } from './salon.controller';
import { SalonService } from './salon.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  ConfigService,
  Salon,
  SalonAdmin,
  SalonDetails,
  SalonDocuments,
  SalonImage,
  SalonReview,
  SalonWeeklyHours,
} from '@charmbooking/common';
import { JwtModule } from '@nestjs/jwt/dist/jwt.module';
import { BookingModule } from '../booking/booking.module';
import { SalonVerifiedRepository } from './salon_verified.repository';
@Module({
  imports: [
    BookingModule,
    TypeOrmModule.forFeature([
      Salon,
      SalonImage,
      SalonAdmin,
      SalonWeeklyHours,
      SalonReview,
      SalonDetails,
      SalonDocuments,
    ]),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.jwt.secret,
        signOptions: { expiresIn: configService.jwt.expiration },
      }),
    }),
  ],
  controllers: [SalonController],
  providers: [SalonService, SalonVerifiedRepository],
})
export class SalonModule {}
