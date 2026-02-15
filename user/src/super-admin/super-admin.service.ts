import {
  GenericError,
  LoginSuperAdminDto,
  LoginSuperAdminResponseDTO,
  Salon,
  SalonDetails,
  SalonDocuments,
  SuperAdmin,
  UserRole,
  VerificationStatus,
} from '@charmbooking/common';
import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';

@Injectable()
export class SuperAdminService {
  constructor(
    @InjectRepository(SuperAdmin)
    private userRepository: Repository<SuperAdmin>,
    @InjectRepository(Salon)
    private salonRepository: Repository<Salon>,
    @InjectRepository(SalonDocuments)
    private salonDocumentsRepository: Repository<SalonDocuments>,
    @InjectRepository(SalonDetails)
    private salonDetailsRepository: Repository<SalonDetails>,
    private jwtService: JwtService,
  ) {}

  async login(
    loginSuperAdminDto: LoginSuperAdminDto,
  ): Promise<LoginSuperAdminResponseDTO> {
    const { username, password } = loginSuperAdminDto;
    const superAdmin = await this.userRepository.findOne({
      where: { username },
    });
    if (!superAdmin) {
      throw new GenericError('Super Admin not found', 404);
    }
    const isPasswordValid = await bcrypt.compare(password, superAdmin.password);
    if (!isPasswordValid) {
      throw new GenericError('Invalid Credentials', 401);
    }
    const token = this.jwtService.sign({
      username: superAdmin.username,
      role: UserRole.SuperAdmin,
    });
    await this.userRepository.save(superAdmin);
    return {
      username: superAdmin.username,
      token,
    };
  }

  async getAllSalons(): Promise<Salon[]> {
    return this.salonRepository.find();
  }

  async getSalonDocuments(salonId: string): Promise<SalonDocuments[]> {
    const documents = await this.salonDocumentsRepository.find({
      where: { salon: { id: salonId } },
    });
    if (!documents || documents.length === 0) {
      throw new GenericError('No salon documents found', 404);
    }
    return documents;
  }

  async getSalonDetails(salonId: string): Promise<SalonDetails> {
    const salonDetails = await this.salonDetailsRepository.findOne({
      where: { salonId },
    });
    if (!salonDetails) {
      throw new GenericError('Salon details not found', 404);
    }
    return salonDetails;
  }

  async getDocumentById(documentId: string): Promise<SalonDocuments> {
    const document = await this.salonDocumentsRepository.findOne({
      where: { id: documentId },
    });
    if (!document) {
      throw new GenericError('Document not found', 404);
    }
    return document;
  }

  async verifySalon(salonId: string): Promise<{ message: string }> {
    const salon = await this.salonRepository.findOne({
      where: { id: salonId },
    });
    if (!salon) {
      throw new GenericError('Salon not found', 404);
    }
    salon.verificationStatus = VerificationStatus.VERIFIED;
    await this.salonRepository.save(salon);
    return { message: 'Salon verified successfully' };
  }

  async failVerification(salonId: string): Promise<{ message: string }> {
    const salon = await this.salonRepository.findOne({
      where: { id: salonId },
    });
    if (!salon) {
      throw new GenericError('Salon not found', 404);
    }
    salon.verificationStatus = VerificationStatus.FAILED;
    await this.salonRepository.save(salon);
    return { message: 'Salon verification failed' };
  }
}
