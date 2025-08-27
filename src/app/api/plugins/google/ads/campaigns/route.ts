import { NextRequest } from 'next/server'
import { getGoogleOAuthTokens } from '@/lib/oauth-tokens'

/**
 * GOOGLE ADS CAMPAIGNS API ROUTE
 * 
 * Purpose: This route acts as a proxy between plugins and Google Ads API
 * Why needed: Google Ads API blocks direct browser requests (CORS), so we need server-side proxy
 * 
 * What this route does:
 * 1. Receives requests from plugin SDK
 * 2. Adds authentication headers for Google Ads API
 * 3. Makes server-side call to Google Ads API
 * 4. Returns simplified data back to plugin
 */

// TypeScript interfaces to define what data looks like
interface GoogleAdsCampaignRequest {
  companyId: string   // Company ID to get OAuth tokens for
  customerId: string  // Google Ads Customer ID (looks like: 123-456-7890)
  query?: string      // GAQL query (Google's SQL-like language for ads data)
}

interface GoogleAdsCampaignResponse {
  results: Array<{
    campaign: {
      id: string                    // Campaign ID
      name: string                  // Campaign name like "Summer Sale 2024"
      status: string                // ENABLED, PAUSED, REMOVED
      advertisingChannelType: string // SEARCH, DISPLAY, YOUTUBE, etc.
    }
    metrics: {
      impressions: string  // How many times ads were shown (as string from Google)
      clicks: string       // How many times ads were clicked
      cost: string         // Total spend in micros (1 dollar = 1,000,000 micros)
      conversions: string  // How many conversions (sales, leads, etc.)
    }
  }>
}

/**
 * GET ENDPOINT - Fetch campaigns for a specific Google Ads customer
 * 
 * URL: /api/plugins/google/ads/campaigns?customerId=123-456-7890
 * Usage: Plugin calls this to get all campaigns for a customer
 */
export async function GET(request: NextRequest) {
  try {
    // STEP 1: Extract parameters from URL
    const { searchParams } = new URL(request.url)
    const companyId = searchParams.get('companyId')
    const customerId = searchParams.get('customerId')
    
    // Validate required parameters
    if (!companyId) {
      return Response.json({ error: 'companyId is required' }, { status: 400 })
    }
    if (!customerId) {
      return Response.json({ error: 'customerId is required' }, { status: 400 })
    }

    // STEP 2: Get OAuth access token from database
    console.log(`[ADS-CAMPAIGNS] Getting Google OAuth tokens for company: ${companyId}`)
    const tokens = await getGoogleOAuthTokens(companyId)
    
    if (!tokens) {
      console.warn(`[ADS-CAMPAIGNS] No valid Google tokens found for company: ${companyId}`)
      return Response.json({ 
        error: 'Google Ads not connected for this company' 
      }, { status: 401 })
    }

    const accessToken = tokens.access_token
    
    // STEP 3: Prepare GAQL query
    // GAQL = Google Ads Query Language (like SQL but for Google Ads)
    // This query asks for campaign details + performance metrics
    const defaultQuery = `
      SELECT 
        campaign.id,
        campaign.name,
        campaign.status,
        campaign.advertising_channel_type,
        metrics.impressions,
        metrics.clicks,
        metrics.cost_micros,
        metrics.conversions
      FROM campaign
      WHERE campaign.status != 'REMOVED'
    `

    // STEP 4: Make the actual API call to Google Ads
    // This is the server-side fetch that bypasses CORS restrictions
    const response = await fetch(`https://googleads.googleapis.com/v14/customers/${customerId}/googleAds:searchStream`, {
      method: 'POST', // Google Ads API uses POST even for reading data
      headers: {
        'Authorization': `Bearer ${accessToken}`,           // OAuth token for authentication
        'developer-token': process.env.GOOGLE_ADS_DEVELOPER_TOKEN!, // Your Google Ads API developer token
        'Content-Type': 'application/json',
        'login-customer-id': customerId // Required when using manager accounts
      },
      body: JSON.stringify({
        query: defaultQuery // The GAQL query we prepared above
      })
    })

    // STEP 5: Handle API errors
    if (!response.ok) {
      const error = await response.json()
      return Response.json({ 
        error: 'Google Ads API error', 
        details: error 
      }, { status: response.status })
    }

    // STEP 6: Parse Google's response
    const data: GoogleAdsCampaignResponse = await response.json()
    
    // STEP 7: Transform data to plugin-friendly format
    // Google returns complex nested objects, we simplify for plugins
    const campaigns = data.results?.map(result => ({
      id: result.campaign.id,
      name: result.campaign.name,
      status: result.campaign.status,
      type: result.campaign.advertisingChannelType,
      metrics: {
        impressions: parseInt(result.metrics.impressions || '0'),
        clicks: parseInt(result.metrics.clicks || '0'),
        cost: parseFloat(result.metrics.cost || '0') / 1000000, // Convert micros to actual dollars
        conversions: parseFloat(result.metrics.conversions || '0')
      }
    })) || []

    // STEP 8: Return standardized response to plugin
    return Response.json({
      success: true,
      campaigns,
      total: campaigns.length
    })

  } catch (error) {
    console.error('Google Ads Campaigns API Error:', error)
    return Response.json({ 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}

/**
 * POST ENDPOINT - Custom GAQL queries
 * 
 * Usage: When plugins need specific data with custom queries
 * Body: { customerId: "123-456-7890", query: "SELECT campaign.name FROM campaign" }
 */
export async function POST(request: NextRequest) {
  try {
    // STEP 1: Parse request body
    const body: GoogleAdsCampaignRequest = await request.json()
    const { companyId, customerId, query } = body

    if (!companyId) {
      return Response.json({ error: 'companyId is required' }, { status: 400 })
    }
    if (!customerId) {
      return Response.json({ error: 'customerId is required' }, { status: 400 })
    }

    // STEP 2: Get OAuth access token from database
    console.log(`[ADS-CAMPAIGNS-POST] Getting Google OAuth tokens for company: ${companyId}`)
    const tokens = await getGoogleOAuthTokens(companyId)
    
    if (!tokens) {
      console.warn(`[ADS-CAMPAIGNS-POST] No valid Google tokens found for company: ${companyId}`)
      return Response.json({ 
        error: 'Google Ads not connected for this company' 
      }, { status: 401 })
    }

    const accessToken = tokens.access_token

    // STEP 3: Use custom query if provided, otherwise basic query
    const gaqlQuery = query || `
      SELECT 
        campaign.id,
        campaign.name,
        campaign.status
      FROM campaign
    `

    // STEP 4: Make Google Ads API call
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

    // STEP 5: Return raw Google response for custom queries
    const data = await response.json()
    return Response.json(data)

  } catch (error) {
    console.error('Google Ads Campaigns POST Error:', error)
    return Response.json({ 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}