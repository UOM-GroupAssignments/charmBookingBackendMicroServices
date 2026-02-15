import { Injectable, Logger } from '@nestjs/common';
import { ClientProxy, ClientProxyFactory, Transport } from '@nestjs/microservices';

@Injectable()
export class DocumentService {
  private readonly logger = new Logger(DocumentService.name);
  private userClient: ClientProxy;

  constructor() {
    this.userClient = ClientProxyFactory.create({
      transport: Transport.TCP,
      options: { host: 'localhost', port: 3001 },
    });
  }

  async getDocumentById(documentId: string): Promise<any> {
    try {
      const document = await this.userClient
        .send('get_document_by_id', documentId)
        .toPromise();
      return document;
    } catch (error) {
      this.logger.error(`Error fetching document ${documentId}: ${error.message}`);
      return null;
    }
  }
}