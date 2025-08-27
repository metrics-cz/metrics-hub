import { NextRequest } from 'next/server'
import { getGoogleOAuthTokens } from '@/lib/oauth-tokens'

/**
 * GOOGLE ANALYTICS REPORTS API ROUTE
 * 
 * Purpose: Fetch website analytics data (traffic, conversions, user behavior)
 * API Used: Google Analytics Reporting API v4
 * 
 * What Analytics data includes:
 * - Sessions (website visits)
 * - Users (unique visitors) 
 * - Page views, bounce rate
 * - Traffic sources (organic, paid, social, etc.)
 * - Conversions and goals
 * - Geographic and demographic data
 * 
 * Note: Google Analytics API uses "View ID" (not Customer ID like Ads)
 */

interface GoogleAnalyticsReportRequest {
  companyId: string           // Company ID to get OAuth tokens for
  viewId: string              // Analytics View ID (like "123456789")
  dateRange: {
    startDate: string         // Format: "YYYY-MM-DD" (e.g., "2024-01-01")
    endDate: string           // Format: "YYYY-MM-DD" (e.g., "2024-01-31")
  }
  metrics: string[]           // What to measure: ["ga:sessions", "ga:users", "ga:pageviews"]
  dimensions?: string[]       // How to group data: ["ga:date", "ga:source", "ga:country"]
  filters?: string            // Optional filters: "ga:country==United States"
  orderBy?: Array<{
    fieldName: string         // Field to sort by
    sortOrder: 'ASCENDING' | 'DESCENDING'
  }>
  pageSize?: number           // Max 10,000 rows per request
}

interface GoogleAnalyticsResponse {
  reports: Array<{
    columnHeader: {
      dimensions: string[]      // Dimension names returned
      metricHeader: {
        metricHeaderEntries: Array<{
          name: string          // Metric name like "ga:sessions"
          type: string          // Data type: "INTEGER", "PERCENT", etc.
        }>
      }
    }
    data: {
      rows: Array<{
        dimensions: string[]    // Dimension values for this row
        metrics: Array<{
          values: string[]      // Metric values as strings (need parsing)
        }>
      }>
      totals: Array<{
        values: string[]        // Grand total values
      }>
    }
  }>
}

/**
 * GET ENDPOINT - Basic Analytics reports
 * 
 * URL: /api/plugins/google/analytics/reports?viewId=123456789&startDate=2024-01-01&endDate=2024-01-31
 * Returns: Sessions, users, pageviews by day for the specified period
 */
export async function GET(request: NextRequest) {
  try {
    // STEP 1: Extract query parameters
    const { searchParams } = new URL(request.url)
    const companyId = searchParams.get('companyId')
    const viewId = searchParams.get('viewId')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    
    // Validate required parameters
    if (!companyId) {
      return Response.json({ error: 'companyId is required' }, { status: 400 })
    }
    if (!viewId) {
      return Response.json({ error: 'viewId is required' }, { status: 400 })
    }
    if (!startDate || !endDate) {
      return Response.json({ error: 'startDate and endDate are required' }, { status: 400 })
    }

    // STEP 2: Get OAuth access token from database
    console.log(`[ANALYTICS-REPORTS] Getting Google OAuth tokens for company: ${companyId}`)
    const tokens = await getGoogleOAuthTokens(companyId)
    
    if (!tokens) {
      console.warn(`[ANALYTICS-REPORTS] No valid Google tokens found for company: ${companyId}`)
      return Response.json({ 
        error: 'Google Analytics not connected for this company' 
      }, { status: 401 })
    }

    const accessToken = tokens.access_token
    
    // STEP 3: Prepare Analytics API request
    // This is a standard request for basic website metrics
    const reportRequest = {
      reportRequests: [{
        viewId: viewId,
        dateRanges: [{
          startDate: startDate,
          endDate: endDate
        }],
        // Basic metrics every website owner wants to know
        metrics: [
          { expression: 'ga:sessions' },      // Number of sessions (visits)
          { expression: 'ga:users' },         // Number of unique users
          { expression: 'ga:pageviews' },     // Total page views
          { expression: 'ga:bounceRate' },    // Percentage who left after 1 page
          { expression: 'ga:avgSessionDuration' }, // Average time on site
          { expression: 'ga:goalCompletionsAll' }  // Total conversions
        ],
        // Group by date to show daily trends
        dimensions: [
          { name: 'ga:date' }
        ],
        // Sort by date (oldest first)
        orderBys: [{
          fieldName: 'ga:date',
          sortOrder: 'ASCENDING'
        }],
        pageSize: 1000
      }]
    }

    // STEP 4: Make API call to Google Analytics
    // Uses different endpoint than Google Ads
    const response = await fetch('https://analyticsreporting.googleapis.com/v4/reports:batchGet', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(reportRequest)
    })

    if (!response.ok) {
      const error = await response.json()
      return Response.json({ 
        error: 'Google Analytics API error', 
        details: error 
      }, { status: response.status })
    }

    // STEP 5: Parse Google Analytics response
    const data: GoogleAnalyticsResponse = await response.json()
    const report = data.reports[0]
    
    // STEP 6: Transform to plugin-friendly format
    // Google Analytics returns complex nested structure, we simplify
    const analytics = report?.data?.rows?.map((row: any) => ({
      date: row.dimensions[0], // Date in YYYYMMDD format
      metrics: {
        sessions: parseInt(row.metrics[0].values[0] || '0'),
        users: parseInt(row.metrics[0].values[1] || '0'), 
        pageviews: parseInt(row.metrics[0].values[2] || '0'),
        bounceRate: parseFloat(row.metrics[0].values[3] || '0'),
        avgSessionDuration: parseFloat(row.metrics[0].values[4] || '0'),
        conversions: parseInt(row.metrics[0].values[5] || '0')
      }
    })) || []

    // STEP 7: Calculate totals
    const totals = report?.data?.totals?.[0]?.values || []
    const summary = {
      totalSessions: parseInt(totals[0] || '0'),
      totalUsers: parseInt(totals[1] || '0'),
      totalPageviews: parseInt(totals[2] || '0'),
      avgBounceRate: parseFloat(totals[3] || '0'),
      avgSessionDuration: parseFloat(totals[4] || '0'),
      totalConversions: parseInt(totals[5] || '0')
    }

    return Response.json({
      success: true,
      dateRange: { startDate, endDate },
      dailyData: analytics,
      summary,
      total: analytics.length
    })

  } catch (error) {
    console.error('Google Analytics Reports API Error:', error)
    return Response.json({ 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}

/**
 * POST ENDPOINT - Custom Analytics reports
 * 
 * Usage: For complex reports with custom metrics, dimensions, and filters
 * Body: { viewId: "123456789", dateRange: {...}, metrics: [...], dimensions: [...] }
 */
export async function POST(request: NextRequest) {
  try {
    const body: GoogleAnalyticsReportRequest = await request.json()
    const { companyId, viewId, dateRange, metrics, dimensions, filters, orderBy, pageSize } = body

    if (!companyId) {
      return Response.json({ error: 'companyId is required' }, { status: 400 })
    }
    if (!viewId || !dateRange) {
      return Response.json({ error: 'viewId and dateRange are required' }, { status: 400 })
    }

    // STEP 1: Get OAuth access token from database
    console.log(`[ANALYTICS-REPORTS-POST] Getting Google OAuth tokens for company: ${companyId}`)
    const tokens = await getGoogleOAuthTokens(companyId)
    
    if (!tokens) {
      console.warn(`[ANALYTICS-REPORTS-POST] No valid Google tokens found for company: ${companyId}`)
      return Response.json({ 
        error: 'Google Analytics not connected for this company' 
      }, { status: 401 })
    }

    const accessToken = tokens.access_token

    // Build custom report request
    const reportRequest = {
      reportRequests: [{
        viewId: viewId,
        dateRanges: [dateRange],
        metrics: metrics.map(metric => ({ expression: metric })),
        dimensions: dimensions?.map(dimension => ({ name: dimension })) || [],
        dimensionFilterClauses: filters ? [{
          filters: [{
            dimensionName: filters.split('==')[0],
            operator: 'EXACT',
            expressions: [filters.split('==')[1]]
          }]
        }] : undefined,
        orderBys: orderBy || [],
        pageSize: pageSize || 1000
      }]
    }

    const response = await fetch('https://analyticsreporting.googleapis.com/v4/reports:batchGet', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(reportRequest)
    })

    if (!response.ok) {
      const error = await response.json()
      return Response.json({ 
        error: 'Google Analytics API error', 
        details: error 
      }, { status: response.status })
    }

    // Return raw Google Analytics response for custom reports
    const data = await response.json()
    return Response.json(data)

  } catch (error) {
    console.error('Google Analytics Custom Reports Error:', error)
    return Response.json({ 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}