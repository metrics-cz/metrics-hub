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
export declare class GoogleSheetsClient extends BaseClient {
    read(params: {
        spreadsheetId: string;
        range: string;
        valueRenderOption?: 'FORMATTED_VALUE' | 'UNFORMATTED_VALUE' | 'FORMULA';
    }): Promise<GoogleSheetsReadResponse>;
    write(params: {
        spreadsheetId: string;
        range: string;
        values: any[][];
        operation: 'append' | 'update' | 'clear';
    }): Promise<GoogleSheetsWriteResponse>;
}
//# sourceMappingURL=GoogleSheetsClient.d.ts.map