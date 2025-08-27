import { NextRequest } from 'next/server'
import { getGoogleOAuthTokens } from '@/lib/oauth-tokens'

/**
 * GOOGLE ADS KEYWORDS API ROUTE
 * 
 * Purpose: Fetch keyword data from Google Ads campaigns
 * Why needed: Keywords are the search terms that trigger ads - crucial for campaign optimization
 * 
 * What keywords include:
 * - Search terms (e.g., "running shoes", "nike sneakers")
 * - Match types (EXACT, PHRASE, BROAD)
 * - Performance metrics (impressions, clicks, cost)
 * - Quality scores and bid amounts
 */

interface GoogleAdsKeywordRequest {
  companyId: string      // Company ID to get OAuth tokens for
  customerId: string     // Google Ads Customer ID
  campaignId?: string    // Optional: filter keywords by specific campaign
  adGroupId?: string     // Optional: filter keywords by specific ad group
  query?: string         // Custom GAQL query
}

interface GoogleAdsKeywordResponse {
  results: Array<{
    keyword: {
      resourceName: string    // Full keyword resource path
      text: string           // The actual keyword text like "running shoes"
      matchType: string      // EXACT, PHRASE, BROAD, BROAD_MODIFIED
    }
    adGroup: {
      id: string           // Ad group this keyword belongs to
      name: string         // Ad group name
    }
    campaign: {
      id: string           // Campaign this keyword belongs to  
      name: string         // Campaign name
    }
    metrics: {
      impressions: string  // How many times keyword triggered ad show
      clicks: string       // How many clicks this keyword generated
      cost: string         // Total cost for this keyword (in micros)
      conversions: string  // Conversions attributed to this keyword
      ctr: number          // Click-through rate (clicks/impressions)
      averageCpc: string   // Average cost per click (in micros)
    }
    keywordView: {
      qualityScore: number // Google's quality score (1-10, higher is better)
    }
  }>
}

/**
 * GET ENDPOINT - Fetch keywords data
 * 
 * URL Examples:
 * - /api/plugins/google/ads/keywords?customerId=123-456-7890 (all keywords)
 * - /api/plugins/google/ads/keywords?customerId=123&campaignId=456 (campaign keywords)
 * - /api/plugins/google/ads/keywords?customerId=123&adGroupId=789 (ad group keywords)
 */
export async function GET(request: NextRequest) {
  try {
    // STEP 1: Extract parameters from URL
    const { searchParams } = new URL(request.url)
    const companyId = searchParams.get('companyId')
    const customerId = searchParams.get('customerId')
    const campaignId = searchParams.get('campaignId')
    const adGroupId = searchParams.get('adGroupId')
    
    if (!companyId) {
      return Response.json({ error: 'companyId is required' }, { status: 400 })
    }
    if (!customerId) {
      return Response.json({ error: 'customerId is required' }, { status: 400 })
    }

    // STEP 2: Get OAuth access token from database
    console.log(`[ADS-KEYWORDS] Getting Google OAuth tokens for company: ${companyId}`)
    const tokens = await getGoogleOAuthTokens(companyId)
    
    if (!tokens) {
      console.warn(`[ADS-KEYWORDS] No valid Google tokens found for company: ${companyId}`)
      return Response.json({ 
        error: 'Google Ads not connected for this company' 
      }, { status: 401 })
    }

    const accessToken = tokens.access_token
    
    // STEP 3: Build GAQL query based on filters
    let whereClause = "WHERE ad_group_criterion.status != 'REMOVED'"
    
    if (campaignId) {
      whereClause += ` AND campaign.id = '${campaignId}'`
    }
    
    if (adGroupId) {
      whereClause += ` AND ad_group.id = '${adGroupId}'`
    }
    
    const keywordsQuery = `
      SELECT 
        ad_group_criterion.keyword.text,
        ad_group_criterion.keyword.match_type,
        ad_group_criterion.resource_name,
        ad_group.id,
        ad_group.name,
        campaign.id,
        campaign.name,
        metrics.impressions,
        metrics.clicks,
        metrics.cost_micros,
        metrics.conversions,
        metrics.ctr,
        metrics.average_cpc,
        ad_group_criterion.quality_info.quality_score
      FROM keyword_view 
      ${whereClause}
      ORDER BY metrics.impressions DESC
    `

    // STEP 4: Make API call to Google Ads
    // Note: Using same searchStream endpoint as campaigns
    const response = await fetch(`https://googleads.googleapis.com/v14/customers/${customerId}/googleAds:searchStream`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'developer-token': process.env.GOOGLE_ADS_DEVELOPER_TOKEN!,
        'Content-Type': 'application/json',
        'login-customer-id': customerId
      },
      body: JSON.stringify({
        query: keywordsQuery
      })
    })

    if (!response.ok) {
      const error = await response.json()
      return Response.json({ 
        error: 'Google Ads API error', 
        details: error 
      }, { status: response.status })
    }

    // STEP 5: Parse and transform Google's response
    const data: GoogleAdsKeywordResponse = await response.json()
    
    // STEP 6: Transform to plugin-friendly format
    const keywords = data.results?.map(result => ({
      // Keyword information
      text: result.keyword.text,
      matchType: result.keyword.matchType,
      resourceName: result.keyword.resourceName,
      
      // Parent information
      adGroup: {
        id: result.adGroup.id,
        name: result.adGroup.name
      },
      campaign: {
        id: result.campaign.id,
        name: result.campaign.name
      },
      
      // Performance metrics
      metrics: {
        impressions: parseInt(result.metrics.impressions || '0'),
        clicks: parseInt(result.metrics.clicks || '0'),
        cost: parseFloat(result.metrics.cost || '0') / 1000000, // Convert micros to dollars
        conversions: parseFloat(result.metrics.conversions || '0'),
        ctr: result.metrics.ctr || 0,
        averageCpc: parseFloat(result.metrics.averageCpc || '0') / 1000000, // Convert micros to dollars
        qualityScore: result.keywordView.qualityScore || null
      }
    })) || []

    return Response.json({
      success: true,
      keywords,
      total: keywords.length,
      filters: {
        customerId,
        campaignId: campaignId || null,
        adGroupId: adGroupId || null
      }
    })

  } catch (error) {
    console.error('Google Ads Keywords API Error:', error)
    return Response.json({ 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}

/**
 * POST ENDPOINT - Custom keyword queries
 * 
 * Usage: For complex keyword analysis with custom GAQL
 * Body: { customerId: "123-456-7890", query: "SELECT ... FROM keyword_view WHERE ..." }
 */
export async function POST(request: NextRequest) {
  try {
    const body: GoogleAdsKeywordRequest = await request.json()
    const { companyId, customerId, query } = body

    if (!companyId) {
      return Response.json({ error: 'companyId is required' }, { status: 400 })
    }
    if (!customerId) {
      return Response.json({ error: 'customerId is required' }, { status: 400 })
    }

    // STEP 1: Get OAuth access token from database
    console.log(`[ADS-KEYWORDS-POST] Getting Google OAuth tokens for company: ${companyId}`)
    const tokens = await getGoogleOAuthTokens(companyId)
    
    if (!tokens) {
      console.warn(`[ADS-KEYWORDS-POST] No valid Google tokens found for company: ${companyId}`)
      return Response.json({ 
        error: 'Google Ads not connected for this company' 
      }, { status: 401 })
    }

    const accessToken = tokens.access_token

    // Use custom query or default basic query
    const gaqlQuery = query || `
      SELECT 
        ad_group_criterion.keyword.text,
        ad_group_criterion.keyword.match_type,
        campaign.name,
        ad_group.name,
        metrics.impressions,
        metrics.clicks
      FROM keyword_view
      WHERE ad_group_criterion.status != 'REMOVED'
      LIMIT 1000
    `

    const response = await fetch(`https://googleads.googleapis.com/v14/customers/${customerId}/googleAds:searchStream`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'developer-token': process.env.GOOGLE_ADS_DEVELOPER_TOKEN!,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        query: gaqlQuery
      })
    })

    if (!response.ok) {
      const error = await response.json()
      return Response.json({ 
        error: 'Google Ads API error', 
        details: error 
      }, { status: response.status })
    }

    // Return raw Google response for custom queries
    const data = await response.json()
    return Response.json(data)

  } catch (error) {
    console.error('Google Ads Keywords POST Error:', error)
    return Response.json({ 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}