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
export declare class GoogleDocsClient extends BaseClient {
    getDocument(documentId: string): Promise<GoogleDocsResponse>;
    createDocument(params: {
        title: string;
        content?: string;
    }): Promise<GoogleDocsCreateResponse>;
    updateDocument(params: {
        documentId: string;
        content: string;
    }): Promise<GoogleDocsResponse>;
}
//# sourceMappingURL=GoogleDocsClient.d.ts.map