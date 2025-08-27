import { GoogleAnalyticsAccountsResponse, GoogleAnalyticsReportsResponse } from '../types/google-analytics';
import { BaseClient } from "./BaseClient";

export class GoogleAnalyticsClient extends BaseClient {
  async getAccounts(): Promise<GoogleAnalyticsAccountsResponse> {
    const queryParams = new URLSearchParams({
      companyId: this.config.companyId
    });

    const endpoint = `/api/plugins/google/analytics/accounts?${queryParams.toString()}`;
    return this.makeRequest<GoogleAnalyticsAccountsResponse>(endpoint);
  }

  async getReports(params: {
    viewId: string;
    startDate: string;
    endDate: string;
  }): Promise<GoogleAnalyticsReportsResponse> {
    const queryParams = new URLSearchParams({
      companyId: this.config.companyId,
      viewId: params.viewId,
      startDate: params.startDate,
      endDate: params.endDate
    });

    const endpoint = `/api/plugins/google/analytics/reports?${queryParams.toString()}`;
    return this.makeRequest<GoogleAnalyticsReportsResponse>(endpoint);
  }
}