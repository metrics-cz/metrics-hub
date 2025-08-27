import { NextRequest } from 'next/server'
import { getGoogleOAuthTokens } from '@/lib/oauth-tokens'

/**
 * GOOGLE ANALYTICS ACCOUNTS API ROUTE
 * 
 * Purpose: List all Analytics accounts, properties, and views that user has access to
 * Why needed: Plugins need to know the View ID before they can fetch reports
 * 
 * Google Analytics hierarchy:
 * Account → Property → View
 * ├── Account = Company/Organization (e.g., "My Business")
 * ├── Property = Website (e.g., "mywebsite.com") 
 * └── View = Filtered data view (e.g., "All Website Data", "Mobile Only")
 * 
 * The View ID is what you need for reports API!
 */

interface GoogleAnalyticsAccountsResponse {
  items: Array<{
    id: string              // Account ID
    name: string            // Account name like "My Business"
    webProperties: Array<{  // Properties = websites in this account
      id: string            // Property ID like "UA-123456789-1"
      name: string          // Property name like "My Website"
      websiteUrl: string    // Actual website URL
      profiles: Array<{     // Views = data views for this property
        id: string          // VIEW ID - this is what you need for reports!
        name: string        // View name like "All Website Data"
        type: string        // Usually "WEB"
      }>
    }>
  }>
}

/**
 * GET ENDPOINT - List all Analytics accounts, properties, and views
 * 
 * URL: /api/plugins/google/analytics/accounts
 * Returns: Hierarchical list of accounts → properties → views
 * Purpose: Help plugins find the correct View ID to use for reports
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
    console.log(`[ANALYTICS-ACCOUNTS] Getting Google OAuth tokens for company: ${companyId}`)
    const tokens = await getGoogleOAuthTokens(companyId)
    
    if (!tokens) {
      console.warn(`[ANALYTICS-ACCOUNTS] No valid Google tokens found for company: ${companyId}`)
      return Response.json({ 
        error: 'Google Analytics not connected for this company' 
      }, { status: 401 })
    }

    const accessToken = tokens.access_token
    
    // STEP 2: Call Google Analytics Management API
    // This API lists accounts/properties/views (different from Reporting API)
    const response = await fetch('https://www.googleapis.com/analytics/v3/management/accounts', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      const error = await response.json()
      return Response.json({ 
        error: 'Google Analytics Management API error', 
        details: error 
      }, { status: response.status })
    }

    // STEP 3: Parse accounts response
    const accountsData = await response.json()
    
    // STEP 4: For each account, fetch properties and views
    // This requires multiple API calls to build the full hierarchy
    const accountsWithProperties = []
    
    for (const account of accountsData.items || []) {
      try {
        // Fetch properties for this account
        const propertiesResponse = await fetch(
          `https://www.googleapis.com/analytics/v3/management/accounts/${account.id}/webproperties`,
          {
            headers: { 'Authorization': `Bearer ${accessToken}` }
          }
        )
        
        if (propertiesResponse.ok) {
          const propertiesData = await propertiesResponse.json()
          const propertiesWithViews = []
          
          // For each property, fetch views
          for (const property of propertiesData.items || []) {
            try {
              const viewsResponse = await fetch(
                `https://www.googleapis.com/analytics/v3/management/accounts/${account.id}/webproperties/${property.id}/profiles`,
                {
                  headers: { 'Authorization': `Bearer ${accessToken}` }
                }
              )
              
              if (viewsResponse.ok) {
                const viewsData = await viewsResponse.json()
                propertiesWithViews.push({
                  id: property.id,
                  name: property.name,
                  websiteUrl: property.websiteUrl,
                  views: viewsData.items?.map((view: any) => ({
                    id: view.id,           // THIS IS THE VIEW ID NEEDED FOR REPORTS!
                    name: view.name,
                    type: view.type
                  })) || []
                })
              }
            } catch (viewError) {
              console.error(`Error fetching views for property ${property.id}:`, viewError)
              // Add property without views if view fetch fails
              propertiesWithViews.push({
                id: property.id,
                name: property.name,
                websiteUrl: property.websiteUrl,
                views: []
              })
            }
          }
          
          accountsWithProperties.push({
            id: account.id,
            name: account.name,
            properties: propertiesWithViews
          })
        }
      } catch (propertyError) {
        console.error(`Error fetching properties for account ${account.id}:`, propertyError)
        // Add account without properties if property fetch fails
        accountsWithProperties.push({
          id: account.id,
          name: account.name,
          properties: []
        })
      }
    }

    // STEP 5: Return structured data to plugin
    return Response.json({
      success: true,
      accounts: accountsWithProperties,
      total: accountsWithProperties.length,
      // Helper: Extract all View IDs for easy reference
      allViewIds: accountsWithProperties.flatMap((account: any) => 
        account.properties.flatMap((property: any) => 
          property.views.map((view: any) => ({
            viewId: view.id,
            accountName: account.name,
            propertyName: property.name,
            viewName: view.name,
            websiteUrl: property.websiteUrl
          }))
        )
      )
    })

  } catch (error) {
    console.error('Google Analytics Accounts API Error:', error)
    return Response.json({ 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}

/**
 * POST ENDPOINT - Get specific account/property details
 * 
 * Usage: Get details for specific account or property
 * Body: { accountId: "12345" } or { accountId: "12345", propertyId: "UA-12345-1" }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { companyId, accountId, propertyId } = body

    if (!companyId) {
      return Response.json({ error: 'companyId is required' }, { status: 400 })
    }
    if (!accountId) {
      return Response.json({ error: 'accountId is required' }, { status: 400 })
    }

    // STEP 1: Get OAuth access token from database
    console.log(`[ANALYTICS-ACCOUNTS-POST] Getting Google OAuth tokens for company: ${companyId}`)
    const tokens = await getGoogleOAuthTokens(companyId)
    
    if (!tokens) {
      console.warn(`[ANALYTICS-ACCOUNTS-POST] No valid Google tokens found for company: ${companyId}`)
      return Response.json({ 
        error: 'Google Analytics not connected for this company' 
      }, { status: 401 })
    }

    const accessToken = tokens.access_token

    if (propertyId) {
      // Get specific property details
      const response = await fetch(
        `https://www.googleapis.com/analytics/v3/management/accounts/${accountId}/webproperties/${propertyId}`,
        {
          headers: { 'Authorization': `Bearer ${accessToken}` }
        }
      )
      
      if (!response.ok) {
        const error = await response.json()
        return Response.json({ 
          error: 'Property not found', 
          details: error 
        }, { status: response.status })
      }
      
      const propertyData = await response.json()
      return Response.json(propertyData)
      
    } else {
      // Get specific account details
      const response = await fetch(
        `https://www.googleapis.com/analytics/v3/management/accounts/${accountId}`,
        {
          headers: { 'Authorization': `Bearer ${accessToken}` }
        }
      )
      
      if (!response.ok) {
        const error = await response.json()
        return Response.json({ 
          error: 'Account not found', 
          details: error 
        }, { status: response.status })
      }
      
      const accountData = await response.json()
      return Response.json(accountData)
    }

  } catch (error) {
    console.error('Google Analytics Account Details Error:', error)
    return Response.json({ 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}