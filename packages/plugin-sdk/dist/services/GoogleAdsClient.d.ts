import { GoogleAdsCampaignsResponse, GoogleAdsKeywordsResponse } from '../types/google-ads';
import { BaseClient } from './BaseClient';
export declare class GoogleAdsClient extends BaseClient {
    getCampaigns(customerId: string, loginCustomerId?: string): Promise<GoogleAdsCampaignsResponse>;
    getKeywords(customerId: string, options?: {
        campaignId?: string;
        adGroupId?: string;
        loginCustomerId?: string;
    }): Promise<GoogleAdsKeywordsResponse>;
    /**
     * Get campaigns for child account through MCC permissions
     * This method implements the Funnel.io/Make.com pattern for accessing child accounts
     * @param childCustomerId - The child account ID to get campaigns for
     * @param mccCustomerId - The parent MCC account ID to use for permissions
     */
    getCampaignsForChildAccount(childCustomerId: string, mccCustomerId: string): Promise<GoogleAdsCampaignsResponse>;
    /**
     * Get keywords for child account through MCC permissions
     * @param childCustomerId - The child account ID to get keywords for
     * @param mccCustomerId - The parent MCC account ID to use for permissions
     * @param options - Additional options like campaignId, adGroupId
     */
    getKeywordsForChildAccount(childCustomerId: string, mccCustomerId: string, options?: {
        campaignId?: string;
        adGroupId?: string;
    }): Promise<GoogleAdsKeywordsResponse>;
}
//# sourceMappingURL=GoogleAdsClient.d.ts.map