import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class FileUploadExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(FileUploadExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';

    // Handle different types of exceptions
    if (exception instanceof HttpException) {
      status = exception.getStatus();
      message = exception.message;
    } else if (exception instanceof Error) {
      // Handle multer-specific errors
      if (exception.message.includes('File too large')) {
        status = HttpStatus.PAYLOAD_TOO_LARGE;
        message = 'File size exceeds the maximum allowed limit';
      } else if (exception.message.includes('Too many files')) {
        status = HttpStatus.BAD_REQUEST;
        message = 'Too many files uploaded';
      } else if (exception.message.includes('Unexpected field')) {
        status = HttpStatus.BAD_REQUEST;
        message = 'Unexpected field in file upload';
      } else if (exception.message.includes('Only') && exception.message.includes('files are allowed')) {
        status = HttpStatus.BAD_REQUEST;
        message = exception.message;
      } else if (exception.message.includes('File validation failed')) {
        status = HttpStatus.BAD_REQUEST;
        message = exception.message;
      } else {
        message = 'File upload error';
      }
    }

    // Log the error for monitoring
    this.logger.error(
      `File upload error: ${message}`,
      exception instanceof Error ? exception.stack : 'Unknown error',
      {
        url: request.url,
        method: request.method,
        userAgent: request.headers['user-agent'],
        ip: request.ip,
      },
    );

    // Clean up any uploaded files on error (if they exist)
    if (request.files) {
      this.cleanupFiles(request.files);
    }

    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      message,
      error: 'File Upload Error',
    });
  }

  private async cleanupFiles(files: any) {
    try {
      const fs = await import('fs');
      const filesToDelete = Array.isArray(files) ? files : Object.values(files).flat();
      
      for (const file of filesToDelete as Express.Multer.File[]) {
        if (file && file.path) {
          try {
            fs.unlinkSync(file.path);
            this.logger.debug(`Cleaned up file: ${file.path}`);
          } catch (deleteError) {
            this.logger.warn(`Failed to delete file ${file.path}: ${deleteError.message}`);
          }
        }
      }
    } catch (error) {
      this.logger.error(`Error during file cleanup: ${error.message}`);
    }
  }
}