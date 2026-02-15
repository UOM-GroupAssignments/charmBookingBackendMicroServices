import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { FileTypeValidatorService, FileCategory } from './file-type-validator.service';

@Injectable()
export class FileValidationInterceptor implements NestInterceptor {
  private readonly logger = new Logger(FileValidationInterceptor.name);

  constructor(
    private readonly fileTypeValidator: FileTypeValidatorService,
  ) {}

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<any>> {
    const request = context.switchToHttp().getRequest();
    const files = request.files;
    const allowedCategories = request.allowedFileCategories;

    if (!files || (Array.isArray(files) && files.length === 0)) {
      // No files to validate, continue
      return next.handle();
    }

    if (!allowedCategories) {
      this.logger.error('No allowed file categories found in request');
      throw new BadRequestException('File validation configuration error');
    }

    try {
      // Handle different file structures from multer
      let filesToValidate: Express.Multer.File[] = [];
      
      if (Array.isArray(files)) {
        // FilesInterceptor - array of files
        filesToValidate = files;
      } else if (files && typeof files === 'object') {
        // FileFieldsInterceptor - object with field names as keys
        filesToValidate = Object.values(files).flat() as Express.Multer.File[];
      } else if (files) {
        // Single file
        filesToValidate = [files];
      }
      
      this.logger.debug(`Validating ${filesToValidate.length} file(s)`);
      
      // Validate each uploaded file
      await Promise.all(
        filesToValidate.map(async (file: Express.Multer.File) => {
          this.logger.debug(`Validating file: ${file.originalname} at path: ${file.path}`);
          
          if (file.buffer) {
            await this.fileTypeValidator.validateFileType(
              file.buffer,
              file.originalname,
              allowedCategories,
            );
          } else {
            // For disk storage, we need to read the file
            const fs = await import('fs');
            try {
              if (!file.path) {
                throw new Error('File path is missing - file may not have been saved');
              }
              
              this.logger.debug(`Reading file from disk: ${file.path}`);
              const fileBuffer = fs.readFileSync(file.path);
              await this.fileTypeValidator.validateFileType(
                fileBuffer,
                file.originalname,
                allowedCategories,
              );
            } catch (error) {
              this.logger.error(`Failed to read file for validation: ${error.message}`);
              this.logger.error(`File details - originalname: ${file.originalname}, path: ${file.path}`);
              throw new BadRequestException('File validation failed - could not read file');
            }
          }
        }),
      );

      this.logger.log(`Successfully validated ${filesToValidate.length} file(s)`);
      return next.handle();
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      
      this.logger.error(`File validation error: ${error.message}`, error.stack);
      throw new BadRequestException('File validation failed');
    }
  }
}