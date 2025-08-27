import { BaseClient } from './BaseClient';

export interface GoogleSheetsReadResponse {
  success: boolean;
  values: any[][];
  range: string;
  majorDimension: string;
}

export interface GoogleSheetsWriteResponse {
  success: boolean;
  updatedRows: number;
  updatedColumns: number;
  updatedCells: number;
}

export class GoogleSheetsClient extends BaseClient {
  async read(params: {
    spreadsheetId: string;
    range: string;
    valueRenderOption?: 'FORMATTED_VALUE' | 'UNFORMATTED_VALUE' | 'FORMULA';
  }): Promise<GoogleSheetsReadResponse> {
    const queryParams = new URLSearchParams({
      companyId: this.config.companyId,
      spreadsheetId: params.spreadsheetId,
      range: params.range,
      ...(params.valueRenderOption && { valueRenderOption: params.valueRenderOption })
    });

    const endpoint = `/api/plugins/google/sheets/read?${queryParams.toString()}`;
    return this.makeRequest<GoogleSheetsReadResponse>(endpoint);
  }

  async write(params: {
    spreadsheetId: string;
    range: string;
    values: any[][];
    operation: 'append' | 'update' | 'clear';
  }): Promise<GoogleSheetsWriteResponse> {
    const endpoint = `/api/plugins/google/sheets/write`;
    return this.makeRequest<GoogleSheetsWriteResponse>(endpoint, {
      method: 'POST',
      body: JSON.stringify({
        companyId: this.config.companyId,
        ...params
      })
    });
  }
}