import {
  Controller,
  Get,
  Param,
  Res,
  UseGuards,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import { SuperAdminGuard } from '../auth/auth.guard';
import { DocumentService } from './document.service';
import { join } from 'path';
import { existsSync } from 'fs';

@Controller('api/documents')
@UseGuards(SuperAdminGuard)
export class DocumentController {
  private readonly logger = new Logger(DocumentController.name);

  constructor(private readonly documentService: DocumentService) {}

  @Get('secure/:documentId')
  async getSecureDocument(
    @Param('documentId') documentId: string,
    @Res() res: Response,
  ): Promise<void> {
    try {
      // Verify document exists and user has access
      const document = await this.documentService.getDocumentById(documentId);
      
      if (!document) {
        this.logger.warn(`Document not found: ${documentId}`);
        throw new NotFoundException('Document not found');
      }

      // Construct file path
      const filePath = join(process.cwd(), document.url);
      
      if (!existsSync(filePath)) {
        this.logger.error(`File not found on disk: ${filePath}`);
        throw new NotFoundException('File not found');
      }

      // Log access attempt
      this.logger.log(`Document accessed: ${documentId} by super-admin`);

      // Set appropriate headers
      res.setHeader('Content-Type', this.getContentType(document.url));
      res.setHeader('Cache-Control', 'private, no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');

      // Send file
      res.sendFile(filePath);
    } catch (error) {
      this.logger.error(`Error serving document ${documentId}: ${error.message}`);
      if (error instanceof NotFoundException || error instanceof ForbiddenException) {
        throw error;
      }
      throw new NotFoundException('Document not found');
    }
  }

  private getContentType(url: string): string {
    const extension = url.split('.').pop()?.toLowerCase();
    const mimeTypes: Record<string, string> = {
      'pdf': 'application/pdf',
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'gif': 'image/gif',
      'doc': 'application/msword',
      'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    };
    return extension ? (mimeTypes[extension] || 'application/octet-stream') : 'application/octet-stream';
  }
}