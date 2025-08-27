/**
 * Google Ads API Types
 *
 * These types match the responses from your plugin API routes
 */
export interface GoogleAdsCampaign {
    id: string;
    name: string;
    status: 'ENABLED' | 'PAUSED' | 'REMOVED';
    type: string;
    metrics: {
        impressions: number;
        clicks: number;
        cost: number;
        conversions: number;
    };
}
export interface GoogleAdsKeyword {
    text: string;
    matchType: 'EXACT' | 'PHRASE' | 'BROAD' | 'BROAD_MODIFIED';
    resourceName: string;
    adGroup: {
        id: string;
        name: string;
    };
    campaign: {
        id: string;
        name: string;
    };
    metrics: {
        impressions: number;
        clicks: number;
        cost: number;
        conversions: number;
        ctr: number;
        averageCpc: number;
        qualityScore: number | null;
    };
}
export interface GoogleAdsCampaignsResponse {
    success: boolean;
    campaigns: GoogleAdsCampaign[];
    total: number;
}
export interface GoogleAdsKeywordsResponse {
    success: boolean;
    keywords: GoogleAdsKeyword[];
    total: number;
    filters: {
        customerId: string;
        campaignId: string | null;
        adGroupId: string | null;
    };
}
export interface UseGoogleAdsOptions {
    customerId: string;
    campaignId?: string;
    adGroupId?: string;
    refreshInterval?: number;
    enabled?: boolean;
}
//# sourceMappingURL=google-ads.d.ts.map