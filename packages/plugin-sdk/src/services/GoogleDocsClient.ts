import { BaseClient } from './BaseClient';

export interface GoogleDocument {
  documentId: string;
  title: string;
  body: {
    content: any[];
  };
  revisionId: string;
}

export interface GoogleDocsResponse {
  success: boolean;
  document: GoogleDocument;
}

export interface GoogleDocsCreateResponse {
  success: boolean;
  document: {
    documentId: string;
    title: string;
    revisionId: string;
  };
}

export class GoogleDocsClient extends BaseClient {
  async getDocument(documentId: string): Promise<GoogleDocsResponse> {
    const queryParams = new URLSearchParams({
      companyId: this.config.companyId,
      documentId
    });

    const endpoint = `/api/plugins/google/docs?${queryParams.toString()}`;
    return this.makeRequest<GoogleDocsResponse>(endpoint);
  }

  async createDocument(params: {
    title: string;
    content?: string;
  }): Promise<GoogleDocsCreateResponse> {
    const endpoint = `/api/plugins/google/docs`;
    return this.makeRequest<GoogleDocsCreateResponse>(endpoint, {
      method: 'POST',
      body: JSON.stringify({
        companyId: this.config.companyId,
        operation: 'create',
        ...params
      })
    });
  }

  async updateDocument(params: {
    documentId: string;
    content: string;
  }): Promise<GoogleDocsResponse> {
    const endpoint = `/api/plugins/google/docs`;
    return this.makeRequest<GoogleDocsResponse>(endpoint, {
      method: 'POST',
      body: JSON.stringify({
        companyId: this.config.companyId,
        operation: 'update',
        ...params
      })
    });
  }
}