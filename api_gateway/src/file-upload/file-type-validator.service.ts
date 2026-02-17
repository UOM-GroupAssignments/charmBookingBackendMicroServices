import { Injectable, Logger, BadRequestException } from '@nestjs/common';

export enum FileCategory {
  IMAGE = 'image',
  DOCUMENT = 'document',
}

export interface AllowedFileType {
  mimeType: string;
  extensions: string[];
  category: FileCategory;
  description: string;
}

@Injectable()
export class FileTypeValidatorService {
  private readonly logger = new Logger(FileTypeValidatorService.name);

  // Comprehensive whitelist of allowed MIME types with their extensions
  private readonly allowedFileTypes: AllowedFileType[] = [
    // Images
    {
      mimeType: 'image/jpeg',
      extensions: ['jpg', 'jpeg'],
      category: FileCategory.IMAGE,
      description: 'JPEG Image',
    },
    {
      mimeType: 'image/png',
      extensions: ['png'],
      category: FileCategory.IMAGE,
      description: 'PNG Image',
    },
    {
      mimeType: 'image/gif',
      extensions: ['gif'],
      category: FileCategory.IMAGE,
      description: 'GIF Image',
    },
    {
      mimeType: 'image/webp',
      extensions: ['webp'],
      category: FileCategory.IMAGE,
      description: 'WebP Image',
    },
    // Documents
    {
      mimeType: 'application/pdf',
      extensions: ['pdf'],
      category: FileCategory.DOCUMENT,
      description: 'PDF Document',
    },
    {
      mimeType: 'application/msword',
      extensions: ['doc'],
      category: FileCategory.DOCUMENT,
      description: 'Microsoft Word Document',
    },
    {
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      extensions: ['docx'],
      category: FileCategory.DOCUMENT,
      description: 'Microsoft Word Document (DOCX)',
    },
    {
      mimeType: 'application/vnd.ms-excel',
      extensions: ['xls'],
      category: FileCategory.DOCUMENT,
      description: 'Microsoft Excel Spreadsheet',
    },
    {
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      extensions: ['xlsx'],
      category: FileCategory.DOCUMENT,
      description: 'Microsoft Excel Spreadsheet (XLSX)',
    },
  ];

  /**
   * Validates file type by inspecting magic bytes and comparing against whitelist
   * @param fileBuffer - The file buffer to validate
   * @param originalName - Original filename for logging
   * @param allowedCategories - Categories of files allowed for this upload
   * @returns Promise<AllowedFileType> - The validated file type information
   * @throws BadRequestException if file type is not allowed or cannot be determined
   */
  async validateFileType(
    fileBuffer: Buffer,
    originalName: string,
    allowedCategories: FileCategory[],
  ): Promise<AllowedFileType> {
    this.logger.debug(`Validating file: ${originalName}`);
    
    if (!fileBuffer || fileBuffer.length === 0) {
      this.logger.error(`Empty buffer received for file: ${originalName}`);
      throw new BadRequestException('File is empty or corrupted');
    }

    try {
      // Use eval to bypass TypeScript/Node.js module resolution issues with ESM
      const fileTypeModule = await eval('import("file-type")');
      const { fileTypeFromBuffer } = fileTypeModule;
      
      // Use file-type library to detect actual MIME type from magic bytes
      const detectedFileType = await fileTypeFromBuffer(fileBuffer);
      
      if (!detectedFileType) {
        this.logger.error(`Could not determine file type for: ${originalName}`);
        throw new BadRequestException(
          'Unable to determine file type. File may be corrupted or of an unsupported format.',
        );
      }

      this.logger.debug(
        `Detected MIME type: ${detectedFileType.mime} for file: ${originalName}`,
      );

      // Find matching allowed file type
      const allowedFileType = this.allowedFileTypes.find(
        (type) => type.mimeType === detectedFileType.mime,
      );

      if (!allowedFileType) {
        this.logger.warn(
          `Rejected file with unsupported MIME type: ${detectedFileType.mime} (${originalName})`,
        );
        throw new BadRequestException(
          `File type '${detectedFileType.mime}' is not allowed. ` +
          `Supported types: ${this.getSupportedMimeTypes(allowedCategories).join(', ')}`,
        );
      }

      // Check if file category is allowed for this upload
      if (!allowedCategories.includes(allowedFileType.category)) {
        this.logger.warn(
          `Rejected file with disallowed category: ${allowedFileType.category} (${originalName})`,
        );
        throw new BadRequestException(
          `File category '${allowedFileType.category}' is not allowed for this upload. ` +
          `Allowed categories: ${allowedCategories.join(', ')}`,
        );
      }

      // Additional validation: Check file extension consistency
      const fileExtension = this.extractExtension(originalName).toLowerCase();
      if (fileExtension && !allowedFileType.extensions.includes(fileExtension)) {
        this.logger.warn(
          `File extension '${fileExtension}' doesn't match detected MIME type '${detectedFileType.mime}' for: ${originalName}`,
        );
        // This is a warning but not a blocking error as MIME type is more reliable
      }

      this.logger.log(
        `File validation successful: ${originalName} (${allowedFileType.mimeType})`,
      );

      return allowedFileType;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      
      this.logger.error(
        `Error validating file ${originalName}: ${error.message}`,
        error.stack,
      );
      throw new BadRequestException(
        'File validation failed due to an internal error',
      );
    }
  }

  /**
   * Get list of supported MIME types for given categories
   */
  getSupportedMimeTypes(categories: FileCategory[]): string[] {
    return this.allowedFileTypes
      .filter((type) => categories.includes(type.category))
      .map((type) => type.mimeType);
  }

  /**
   * Get list of supported extensions for given categories
   */
  getSupportedExtensions(categories: FileCategory[]): string[] {
    return this.allowedFileTypes
      .filter((type) => categories.includes(type.category))
      .flatMap((type) => type.extensions);
  }

  /**
   * Extract file extension from filename
   */
  private extractExtension(filename: string): string {
    const lastDot = filename.lastIndexOf('.');
    return lastDot === -1 ? '' : filename.substring(lastDot + 1);
  }

  /**
   * Get human-readable error message for unsupported file types
   */
  getUnsupportedFileMessage(categories: FileCategory[]): string {
    const supportedTypes = this.allowedFileTypes
      .filter((type) => categories.includes(type.category))
      .map((type) => `${type.description} (${type.extensions.join(', ')})`)
      .join(', ');
    
    return `Supported file types: ${supportedTypes}`;
  }
}