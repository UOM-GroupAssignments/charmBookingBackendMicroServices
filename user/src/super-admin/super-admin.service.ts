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

  private static readonly MAX_FAILED_ATTEMPTS = 5;
  private static readonly LOCKOUT_DURATION_MINUTES = 30;

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

    // Check if account is temporarily locked
    if (superAdmin.lockedUntil && superAdmin.lockedUntil > new Date()) {
      const remainingMs = superAdmin.lockedUntil.getTime() - Date.now();
      const remainingMin = Math.ceil(remainingMs / 60000);
      throw new GenericError(
        `Account is temporarily locked. Try again in ${remainingMin} minute(s).`,
        429,
      );
    }

    const isPasswordValid = await bcrypt.compare(password, superAdmin.password);
    if (!isPasswordValid) {
      superAdmin.loginFailedAttempts += 1;

      // Lock account after reaching max failed attempts with progressive delay
      if (
        superAdmin.loginFailedAttempts >=
        SuperAdminService.MAX_FAILED_ATTEMPTS
      ) {
        // Progressive lockout: multiply base duration by how many lockout cycles
        const lockoutCycles = Math.floor(
          superAdmin.loginFailedAttempts /
            SuperAdminService.MAX_FAILED_ATTEMPTS,
        );
        const lockoutMinutes =
          SuperAdminService.LOCKOUT_DURATION_MINUTES * lockoutCycles;
        superAdmin.lockedUntil = new Date(
          Date.now() + lockoutMinutes * 60 * 1000,
        );
        await this.userRepository.save(superAdmin);
        throw new GenericError(
          `Too many failed login attempts. Account locked for ${lockoutMinutes} minutes.`,
          429,
        );
      }

      await this.userRepository.save(superAdmin);
      const remaining =
        SuperAdminService.MAX_FAILED_ATTEMPTS -
        superAdmin.loginFailedAttempts;
      throw new GenericError(
        `Invalid Credentials. ${remaining} attempt(s) remaining before lockout.`,
        401,
      );
    }

    // Successful login — reset failed attempts and lockout
    superAdmin.loginFailedAttempts = 0;
    superAdmin.lockedUntil = null;
    superAdmin.lastLoginTime = new Date();

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
