import { BaseClient } from './BaseClient';

export interface GoogleDriveFile {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  createdTime: string;
  modifiedTime: string;
  webViewLink: string;
  webContentLink?: string;
}

export interface GoogleDriveFilesResponse {
  success: boolean;
  files: GoogleDriveFile[];
  nextPageToken?: string;
}

export interface GoogleDriveFileResponse {
  success: boolean;
  file: GoogleDriveFile;
}

export class GoogleDriveClient extends BaseClient {
  async getFiles(params: {
    query?: string;
    pageSize?: number;
    orderBy?: string;
  } = {}): Promise<GoogleDriveFilesResponse> {
    const queryParams = new URLSearchParams({
      companyId: this.config.companyId,
      ...(params.query && { q: params.query }),
      ...(params.pageSize && { pageSize: params.pageSize.toString() }),
      ...(params.orderBy && { orderBy: params.orderBy })
    });

    const endpoint = `/api/plugins/google/drive/files?${queryParams.toString()}`;
    return this.makeRequest<GoogleDriveFilesResponse>(endpoint);
  }

  async getFile(fileId: string): Promise<GoogleDriveFileResponse> {
    const queryParams = new URLSearchParams({
      companyId: this.config.companyId
    });

    const endpoint = `/api/plugins/google/drive/files/${fileId}?${queryParams.toString()}`;
    return this.makeRequest<GoogleDriveFileResponse>(endpoint);
  }
}