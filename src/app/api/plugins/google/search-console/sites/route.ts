import { NextRequest } from 'next/server'
import { getGoogleOAuthTokens } from '@/lib/oauth-tokens'

/**
 * GOOGLE SEARCH CONSOLE SITES API ROUTE
 * 
 * Purpose: Access Google Search Console data for SEO insights
 * What Search Console provides:
 * - Search performance (clicks, impressions, CTR, position)
 * - Which queries bring traffic to your site
 * - Which pages perform best in search
 * - Mobile usability issues
 * - Index coverage issues
 * 
 * This is crucial data for SEO optimization plugins
 */

interface SearchConsolePerformanceRequest {
  companyId: string           // Company ID to get OAuth tokens for
  siteUrl: string             // Site URL like "https://example.com/" or "sc-domain:example.com"
  startDate: string           // Format: "YYYY-MM-DD"
  endDate: string             // Format: "YYYY-MM-DD" 
  dimensions?: string[]       // What to group by: ["query", "page", "country", "device"]
  searchType?: 'web' | 'image' | 'video'  // Type of search results
  rowLimit?: number           // Max rows to return (default: 1000)
  startRow?: number           // For pagination
}

interface SearchConsoleSitesResponse {
  siteEntry: Array<{
    siteUrl: string           // The site URL
    permissionLevel: string   // User's access level: "siteOwner", "siteFullUser", etc.
  }>
}

interface SearchConsolePerformanceResponse {
  rows: Array<{
    keys: string[]            // Values for the dimensions (e.g., ["nike shoes", "https://example.com/shoes"])
    clicks: number            // Number of clicks from search results
    impressions: number       // Number of times appeared in search results
    ctr: number              // Click-through rate (clicks/impressions)
    position: number         // Average position in search results (1 = top)
  }>
  responseAggregationType: string
}

/**
 * GET ENDPOINT - List all sites user has access to in Search Console
 * 
 * URL: /api/plugins/google/search-console/sites
 * Returns: List of websites the user can access in Search Console
 */
export async function GET(request: NextRequest) {
  try {
    // STEP 1: Extract companyId from query parameters
    const { searchParams } = new URL(request.url)
    const companyId = searchParams.get('companyId')
    
    if (!companyId) {
      return Response.json({ error: 'companyId is required' }, { status: 400 })
    }

    // STEP 2: Get OAuth access token from database
    console.log(`[SEARCH-CONSOLE] Getting Google OAuth tokens for company: ${companyId}`)
    const tokens = await getGoogleOAuthTokens(companyId)
    
    if (!tokens) {
      console.warn(`[SEARCH-CONSOLE] No valid Google tokens found for company: ${companyId}`)
      return Response.json({ 
        error: 'Search Console not connected for this company' 
      }, { status: 401 })
    }

    const accessToken = tokens.access_token

    // STEP 1: Get list of sites user has access to
    const response = await fetch(
      'https://www.googleapis.com/webmasters/v3/sites',
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    )

    if (!response.ok) {
      const error = await response.json()
      return Response.json({ 
        error: 'Search Console API error', 
        details: error 
      }, { status: response.status })
    }

    // STEP 2: Parse sites response
    const data: SearchConsoleSitesResponse = await response.json()

    // STEP 3: Transform to plugin-friendly format
    const sites = data.siteEntry?.map(site => ({
      url: site.siteUrl,
      permissionLevel: site.permissionLevel,
      isDomain: site.siteUrl.startsWith('sc-domain:'), // Domain property vs URL prefix
      displayName: site.siteUrl.replace('sc-domain:', '').replace('https://', '').replace('http://', '')
    })) || []

    return Response.json({
      success: true,
      sites,
      total: sites.length
    })

  } catch (error) {
    console.error('Search Console Sites API Error:', error)
    return Response.json({ 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}

/**
 * POST ENDPOINT - Get search performance data for a specific site
 * 
 * Usage: Get detailed SEO performance data
 * Body: { 
 *   siteUrl: "https://example.com/", 
 *   startDate: "2024-01-01", 
 *   endDate: "2024-01-31",
 *   dimensions: ["query", "page"]
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body: SearchConsolePerformanceRequest = await request.json()
    const { 
      companyId,
      siteUrl, 
      startDate, 
      endDate, 
      dimensions = ['query'], 
      searchType = 'web',
      rowLimit = 1000,
      startRow = 0
    } = body

    if (!companyId) {
      return Response.json({ 
        error: 'companyId is required' 
      }, { status: 400 })
    }
    if (!siteUrl || !startDate || !endDate) {
      return Response.json({ 
        error: 'siteUrl, startDate, and endDate are required' 
      }, { status: 400 })
    }

    // Validate date format
    if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate) || !/^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
      return Response.json({ 
        error: 'Dates must be in YYYY-MM-DD format' 
      }, { status: 400 })
    }

    // STEP 1: Get OAuth access token from database
    console.log(`[SEARCH-CONSOLE-POST] Getting Google OAuth tokens for company: ${companyId}`)
    const tokens = await getGoogleOAuthTokens(companyId)
    
    if (!tokens) {
      console.warn(`[SEARCH-CONSOLE-POST] No valid Google tokens found for company: ${companyId}`)
      return Response.json({ 
        error: 'Search Console not connected for this company' 
      }, { status: 401 })
    }

    const accessToken = tokens.access_token

    // STEP 1: Prepare performance query request
    const performanceRequest = {
      startDate,
      endDate,
      dimensions,
      searchType,
      rowLimit,
      startRow,
      // Optional: Add filters
      // dimensionFilterGroups: [{
      //   filters: [{
      //     dimension: 'country',
      //     operator: 'equals',
      //     expression: 'usa'
      //   }]
      // }]
    }

    // STEP 2: Make API call to get performance data
    // Note: siteUrl needs to be URL encoded in the path
    const encodedSiteUrl = encodeURIComponent(siteUrl)
    const response = await fetch(
      `https://www.googleapis.com/webmasters/v3/sites/${encodedSiteUrl}/searchAnalytics/query`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(performanceRequest)
      }
    )

    if (!response.ok) {
      const error = await response.json()
      return Response.json({ 
        error: 'Search Console Performance API error', 
        details: error 
      }, { status: response.status })
    }

    // STEP 3: Parse performance response
    const data: SearchConsolePerformanceResponse = await response.json()

    // STEP 4: Transform to plugin-friendly format
    const performanceData = data.rows?.map(row => {
      const result: any = {
        clicks: row.clicks,
        impressions: row.impressions,
        ctr: row.ctr,
        position: row.position
      }

      // Map dimension values to readable keys
      dimensions.forEach((dimension, index) => {
        switch (dimension) {
          case 'query':
            result.searchQuery = row.keys[index]
            break
          case 'page':
            result.page = row.keys[index]
            break
          case 'country':
            result.country = row.keys[index]
            break
          case 'device':
            result.device = row.keys[index] // DESKTOP, MOBILE, TABLET
            break
          case 'date':
            result.date = row.keys[index]
            break
          default:
            result[dimension] = row.keys[index]
        }
      })

      return result
    }) || []

    // STEP 5: Calculate summary statistics
    const summary = {
      totalClicks: performanceData.reduce((sum, row) => sum + row.clicks, 0),
      totalImpressions: performanceData.reduce((sum, row) => sum + row.impressions, 0),
      averageCtr: performanceData.length > 0 ? 
        performanceData.reduce((sum, row) => sum + row.ctr, 0) / performanceData.length : 0,
      averagePosition: performanceData.length > 0 ? 
        performanceData.reduce((sum, row) => sum + row.position, 0) / performanceData.length : 0
    }

    return Response.json({
      success: true,
      siteUrl,
      dateRange: { startDate, endDate },
      dimensions,
      searchType,
      data: performanceData,
      summary,
      totalRows: performanceData.length,
      // Add helpful insights
      insights: {
        topQuery: performanceData.find(row => 'searchQuery' in row) || null,
        topPage: performanceData.find(row => 'page' in row) || null,
        needsImprovement: performanceData.filter(row => row.position > 10).length // Pages ranking below position 10
      }
    })

  } catch (error) {
    console.error('Search Console Performance Error:', error)
    return Response.json({ 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}