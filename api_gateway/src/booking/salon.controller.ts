import {
  SalonDocumentType,
  SalonRankedRequestDto,
  SalonSubmitDetailsRequestDto,
} from '@charmbooking/common';
import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  Post,
  Put,
  Query,
  UploadedFiles,
  UseInterceptors,
  Logger,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import {
  FileFieldsInterceptor,
  FilesInterceptor,
} from '@nestjs/platform-express';
import { firstValueFrom } from 'rxjs';
import {
  multerConfig,
  salonDocumentsMulterConfig,
  FileTypeValidatorService,
  FileCategory,
} from 'src/file-upload/multer.config';
import { FileValidationInterceptor } from 'src/file-upload/file-validation.interceptor';

@Controller('salon')
export class SalonController {
  private readonly logger = new Logger(SalonController.name);

  constructor(
    @Inject('BOOKING_SERVICE') private client: ClientProxy,
    private readonly fileTypeValidator: FileTypeValidatorService,
  ) {}

  @Get('getSalons')
  async getSalons(): Promise<any> {
    const pattern = { cmd: 'get_salons' };
    const data = {};
    return firstValueFrom(this.client.send<any>(pattern, data));
  }

  @Get('getSalonsRanked')
  async getSalonsRanked(
    @Query('categoryId') categoryId: number,
    @Query('longitude') longitude: number,
    @Query('latitude') latitude: number,
    @Query('date') date: string,
    @Query('time') time: string,
  ): Promise<any> {
    const request: SalonRankedRequestDto = {
      categoryId: Number(categoryId),
      longitude: Number(longitude),
      latitude: Number(latitude),
      date,
      time,
    };
    const pattern = { cmd: 'get_salons_ranked' };
    return firstValueFrom(this.client.send<any>(pattern, request));
  }

  @Get('getSalon/:id')
  async getSalonById(@Param('id') id: number): Promise<any> {
    const pattern = { cmd: 'get_salon_by_id' };
    return firstValueFrom(this.client.send<any>(pattern, id));
  }

  @Post('registerSalon')
  @UseInterceptors(
    FilesInterceptor('salonImages', 10, multerConfig),
    FileValidationInterceptor,
  )
  async registerSalon(
    @Body() salonData: any,
    @UploadedFiles() images: Array<Express.Multer.File>,
  ): Promise<any> {
    this.logger.log(`Registering salon with ${images?.length || 0} images`);
    
    // Additional validation - ensure images are actually provided for salon registration
    if (!images || images.length === 0) {
      this.logger.warn('Salon registration attempted without images');
    }

    const pattern = { cmd: 'register_salon' };
    return firstValueFrom(
      this.client.send<any>(pattern, { salonData, images }),
    );
  }

  @Post('loginSalon')
  async loginSalon(@Body() loginData: any): Promise<any> {
    const pattern = { cmd: 'login_salon' };
    return firstValueFrom(this.client.send<any>(pattern, loginData));
  }

  @Get('findAllSalonCategories')
  async findAllSalonCategories(): Promise<any> {
    const pattern = { cmd: 'findAllSalonCategories' };
    return firstValueFrom(this.client.send<any>(pattern, {}));
  }

  @Get('getSalonProfile/:id')
  async getSalonProfile(@Param('id') id: number): Promise<any> {
    console.log('Fetching salon profile for ID:', id);
    const pattern = { cmd: 'get_salon_profile' };
    return firstValueFrom(this.client.send<any>(pattern, id));
  }

  @Post('addSalonReview')
  async addSalonReview(@Body() reviewData: any): Promise<any> {
    console.log('Received salon review data:', reviewData);
    const pattern = { cmd: 'add_salon_review' };
    return firstValueFrom(this.client.send<any>(pattern, { reviewData }));
  }

  @Post(':id/addSalonWeeklyHours')
  async addSalonWeeklyHours(
    @Param('id') salonID: string,
    @Body() data: any,
  ): Promise<any> {
    const pattern = { cmd: 'add_salon_weekly_hours' };
    return firstValueFrom(
      this.client.send<any>(pattern, {
        salonID,
        weeklyHoursData: data.weeklyHours,
      }),
    );
  }

  @Put(':id/updateSalonWeeklyHours')
  async updateSalonWeeklyHours(
    @Param('id') salonID: string,
    @Body() data: any,
  ): Promise<any> {
    console.log('Received salon weekly hours update data:', data);
    const pattern = { cmd: 'update_salon_weekly_hours' };
    return firstValueFrom(
      this.client.send<any>(pattern, {
        salonID,
        weeklyHoursData: data.weeklyHours,
      }),
    );
  }

  @Get(':id/getSalonWeeklyHours')
  async getSalonWeeklyHours(@Param('id') salonID: string): Promise<any> {
    const pattern = { cmd: 'get_salon_weekly_hours' };
    return firstValueFrom(this.client.send<any>(pattern, salonID));
  }

  @Post('submitSalonDetails')
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: SalonDocumentType.ID_PROOF, maxCount: 1 },
        { name: SalonDocumentType.BANKING_PROOF, maxCount: 1 },
        { name: SalonDocumentType.COMPANY_REGISTRATION, maxCount: 1 },
      ],
      salonDocumentsMulterConfig,
    ),
    FileValidationInterceptor,
  )
  async submitSalonDetails(
    @Body()
    request: SalonSubmitDetailsRequestDto<Express.Multer.File>,
    @UploadedFiles() documents: { [key: string]: Express.Multer.File[] },
  ): Promise<any> {
    this.logger.log(`Submitting salon details with documents: ${Object.keys(documents).join(', ')}`);
    
    const pattern = { cmd: 'submit_salon_details' };
    const singleFiles: { [key: string]: Express.Multer.File | undefined } = {};
    Object.keys(documents).forEach((key) => {
      singleFiles[key] = documents[key]?.[0];
    });
    const { salonId, ...details } = request;
    
    this.logger.debug('Submitting salon details with validated documents');
    
    return firstValueFrom(
      this.client.send<any>(pattern, {
        salonId,
        details,
        documents: { ...singleFiles },
      }),
    );
  }
}
