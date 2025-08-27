import { GoogleAdsCampaignsResponse, GoogleAdsKeywordsResponse } from '../types/google-ads';
import { BaseClient } from './BaseClient';
export declare class GoogleAdsClient extends BaseClient {
    getCampaigns(customerId: string): Promise<GoogleAdsCampaignsResponse>;
    getKeywords(customerId: string, options?: {
        campaignId?: string;
        adGroupId?: string;
    }): Promise<GoogleAdsKeywordsResponse>;
}
//# sourceMappingURL=GoogleAdsClient.d.ts.map