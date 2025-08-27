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
export declare class GoogleDriveClient extends BaseClient {
    getFiles(params?: {
        query?: string;
        pageSize?: number;
        orderBy?: string;
    }): Promise<GoogleDriveFilesResponse>;
    getFile(fileId: string): Promise<GoogleDriveFileResponse>;
}
//# sourceMappingURL=GoogleDriveClient.d.ts.map