import { BaseClient } from './BaseClient';
export interface GmailMessage {
    id: string;
    threadId: string;
    snippet: string;
    payload: {
        headers: Array<{
            name: string;
            value: string;
        }>;
    };
    internalDate: string;
    sizeEstimate: number;
}
export interface GmailMessagesResponse {
    success: boolean;
    messages: GmailMessage[];
    nextPageToken?: string;
    resultSizeEstimate: number;
}
export declare class GmailClient extends BaseClient {
    getMessages(params?: {
        query?: string;
        maxResults?: number;
        labelIds?: string[];
    }): Promise<GmailMessagesResponse>;
}
//# sourceMappingURL=GmailClient.d.ts.map