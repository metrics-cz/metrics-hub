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

export class GmailClient extends BaseClient {
  async getMessages(params: {
    query?: string;
    maxResults?: number;
    labelIds?: string[];
  } = {}): Promise<GmailMessagesResponse> {
    const queryParams = new URLSearchParams({
      companyId: this.config.companyId,
      ...(params.query && { q: params.query }),
      ...(params.maxResults && { maxResults: params.maxResults.toString() }),
      ...(params.labelIds && { labelIds: params.labelIds.join(',') })
    });

    const endpoint = `/api/plugins/google/gmail/messages?${queryParams.toString()}`;
    return this.makeRequest<GmailMessagesResponse>(endpoint);
  }
}