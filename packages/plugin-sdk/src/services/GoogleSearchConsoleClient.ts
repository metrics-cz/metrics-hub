import { BaseClient } from './BaseClient';

export interface SearchConsoleSite {
  siteUrl: string;
  permissionLevel: 'siteFullUser' | 'siteOwner' | 'siteRestrictedUser' | 'siteUnverifiedUser';
}

export interface SearchConsolePerformanceData {
  keys: string[];
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

export interface SearchConsoleSitesResponse {
  success: boolean;
  sites: SearchConsoleSite[];
  performanceData?: SearchConsolePerformanceData[];
}

export class GoogleSearchConsoleClient extends BaseClient {
  async getSites(params: {
    siteUrl?: string;
    startDate?: string;
    endDate?: string;
    dimensions?: string[];
  } = {}): Promise<SearchConsoleSitesResponse> {
    const queryParams = new URLSearchParams({
      companyId: this.config.companyId,
      ...(params.siteUrl && { siteUrl: params.siteUrl }),
      ...(params.startDate && { startDate: params.startDate }),
      ...(params.endDate && { endDate: params.endDate }),
      ...(params.dimensions && { dimensions: params.dimensions.join(',') })
    });

    const endpoint = `/api/plugins/google/search-console/sites?${queryParams.toString()}`;
    return this.makeRequest<SearchConsoleSitesResponse>(endpoint);
  }
}