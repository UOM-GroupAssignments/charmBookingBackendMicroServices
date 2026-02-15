import { Controller } from '@nestjs/common';
import { SuperAdminService } from './super-admin.service';
import { MessagePattern } from '@nestjs/microservices';
import { LoginSuperAdminDto } from '@charmbooking/common';

@Controller('super-admin')
export class SuperAdminController {
  constructor(private readonly superAdminService: SuperAdminService) {}

  @MessagePattern({ cmd: 'super_admin_login' })
  async login(loginUserDto: LoginSuperAdminDto): Promise<any> {
    return this.superAdminService.login(loginUserDto);
  }

  @MessagePattern({ cmd: 'get_all_salons' })
  async getAllSalons(): Promise<any> {
    return this.superAdminService.getAllSalons();
  }

  @MessagePattern({ cmd: 'get_salon_documents' })
  async getSalonDocuments(salonId: string): Promise<any> {
    return this.superAdminService.getSalonDocuments(salonId);
  }

  @MessagePattern({ cmd: 'get_salon_details' })
  async getSalonDetails(salonId: string): Promise<any> {
    return this.superAdminService.getSalonDetails(salonId);
  }

  @MessagePattern({ cmd: 'verify_salon' })
  async verifySalon(salonId: string): Promise<any> {
    return this.superAdminService.verifySalon(salonId);
  }

  @MessagePattern({ cmd: 'fail_verification' })
  async failVerification(salonId: string): Promise<any> {
    return this.superAdminService.failVerification(salonId);
  }

  @MessagePattern('get_document_by_id')
  async getDocumentById(documentId: string): Promise<any> {
    return this.superAdminService.getDocumentById(documentId);
  }
}
