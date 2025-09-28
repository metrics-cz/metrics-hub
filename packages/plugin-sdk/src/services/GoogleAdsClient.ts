import {
  GoogleAdsCampaignsResponse,
  GoogleAdsKeywordsResponse
} from '../types/google-ads';
import { BaseClient } from './BaseClient';

export class GoogleAdsClient extends BaseClient {
    async getCampaigns(customerId: string, loginCustomerId?: string): Promise<GoogleAdsCampaignsResponse> {
      const params = new URLSearchParams({
        companyId: this.config.companyId,
        customerId
      })

      // Add MCC context if provided for accessing child accounts
      if (loginCustomerId) {
        params.set('loginCustomerId', loginCustomerId)
      }

      const endpoint = `/api/plugins/google/ads/campaigns?${params.toString()}`
      return this.makeRequest<GoogleAdsCampaignsResponse>(endpoint)
    }

    async getKeywords(customerId: string, options: {
      campaignId?: string
      adGroupId?: string
      loginCustomerId?: string
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

      // Add MCC context if provided for accessing child accounts
      if (options.loginCustomerId) {
        params.set('loginCustomerId', options.loginCustomerId)
      }

      const endpoint = `/api/plugins/google/ads/keywords?${params.toString()}`
      return this.makeRequest<GoogleAdsKeywordsResponse>(endpoint)
    }

    /**
     * Get campaigns for child account through MCC permissions
     * This method implements the Funnel.io/Make.com pattern for accessing child accounts
     * @param childCustomerId - The child account ID to get campaigns for
     * @param mccCustomerId - The parent MCC account ID to use for permissions
     */
    async getCampaignsForChildAccount(childCustomerId: string, mccCustomerId: string): Promise<GoogleAdsCampaignsResponse> {
      return this.getCampaigns(childCustomerId, mccCustomerId);
    }

    /**
     * Get keywords for child account through MCC permissions
     * @param childCustomerId - The child account ID to get keywords for
     * @param mccCustomerId - The parent MCC account ID to use for permissions
     * @param options - Additional options like campaignId, adGroupId
     */
    async getKeywordsForChildAccount(childCustomerId: string, mccCustomerId: string, options: {
      campaignId?: string
      adGroupId?: string
    } = {}): Promise<GoogleAdsKeywordsResponse> {
      return this.getKeywords(childCustomerId, {
        ...options,
        loginCustomerId: mccCustomerId
      });
    }
  }
