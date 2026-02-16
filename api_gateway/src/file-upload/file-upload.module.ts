import { Module } from '@nestjs/common';
import { FileUploadService } from './file-upload.service';
import { FileTypeValidatorService } from './file-type-validator.service';

@Module({
  providers: [FileUploadService, FileTypeValidatorService],
  exports: [FileUploadService, FileTypeValidatorService],
})
export class FileUploadModule {}
