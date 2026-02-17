import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UserModule } from './user/user.module';
import { CommonModule, ConfigModule } from '@charmbooking/common';
import { SuperAdminModule } from './super-admin/super-admin.module';

@Module({
  imports: [ConfigModule, CommonModule, UserModule, SuperAdminModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
