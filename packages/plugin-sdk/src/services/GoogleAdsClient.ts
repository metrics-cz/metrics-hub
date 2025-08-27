import { GoogleAdsCampaignsResponse, GoogleAdsKeywordsResponse } from '../types/google-ads';
import { BaseClient } from './BaseClient';

export class GoogleAdsClient extends BaseClient {
    async getCampaigns(customerId: string): Promise<GoogleAdsCampaignsResponse> {
      const params = new URLSearchParams({
        companyId: this.config.companyId,
        customerId
      })

      const endpoint = `/api/plugins/google/ads/campaigns?${params.toString()}`
      return this.makeRequest<GoogleAdsCampaignsResponse>(endpoint)
    }

    async getKeywords(customerId: string, options: {
      campaignId?: string
      adGroupId?: string
    } = {}): Promise<GoogleAdsKeywordsResponse> {
      const params = new URLSearchParams({
        companyId: this.config.companyId,
        customerId
      })

      if (options.campaignId) {
        params.set('campaignId', options.campaignId)
      }

      if (options.adGroupId) {
        params.set('adGroupId', options.adGroupId)
      }

      const endpoint = `/api/plugins/google/ads/keywords?${params.toString()}`
      return this.makeRequest<GoogleAdsKeywordsResponse>(endpoint)
    }
  }
