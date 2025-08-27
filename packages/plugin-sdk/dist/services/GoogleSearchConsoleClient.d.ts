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
export declare class GoogleSearchConsoleClient extends BaseClient {
    getSites(params?: {
        siteUrl?: string;
        startDate?: string;
        endDate?: string;
        dimensions?: string[];
    }): Promise<SearchConsoleSitesResponse>;
}
//# sourceMappingURL=GoogleSearchConsoleClient.d.ts.map