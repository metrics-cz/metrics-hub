import { GoogleAnalyticsAccountsResponse, GoogleAnalyticsReportsResponse } from '../types/google-analytics';
import { BaseClient } from "./BaseClient";
export declare class GoogleAnalyticsClient extends BaseClient {
    getAccounts(): Promise<GoogleAnalyticsAccountsResponse>;
    getReports(params: {
        viewId: string;
        startDate: string;
        endDate: string;
    }): Promise<GoogleAnalyticsReportsResponse>;
}
//# sourceMappingURL=GoogleAnalyticsClient.d.ts.map