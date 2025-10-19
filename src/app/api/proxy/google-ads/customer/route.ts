import { NextRequest } from 'next/server';
import { getGoogleOAuthTokens } from '@/lib/oauth-tokens';

/**
 * PROXY ENDPOINT FOR GOOGLE ADS CUSTOMER VALIDATION
 * 
 * This endpoint validates and gets details for a specific customer ID
 * Plugin expects: /api/proxy/google-ads/customer?companyId=xyz&customerId=123-456-7890
 * This calls Google Ads API to validate and get customer information
 */

interface GoogleAdsCustomer {
  customerId: string;
  descriptiveName: string;
  currencyCode: string;
  timeZone: string;
  accountType: string;
  valid: boolean;
}

export async function GET(request: NextRequest) {
  try {
    // Extract parameters from URL
    const { searchParams } = new URL(request.url);
    let companyId = searchParams.get('companyId');
    let customerId = searchParams.get('customerId');
    
    if (!companyId) {
      return Response.json({ error: 'companyId is required' }, { status: 400 });
    }
    
    if (!customerId) {
      return Response.json({ error: 'customerId is required' }, { status: 400 });
    }

    // Handle hardcoded "production-company" from plugin - map to real company ID
    if (companyId === 'production-company') {
      console.log(`[PROXY-CUSTOMER] Mapping production-company to real company ID`);
      const referer = request.headers.get('referer');
      
      if (referer) {
        const match = referer.match(/companies\/([a-f0-9-]+)\/apps/);
        if (match && match[1]) {
          companyId = match[1];
          console.log(`[PROXY-CUSTOMER] Extracted company ID from referer: ${companyId}`);
        }
      }
      
      if (companyId === 'production-company') {
        console.warn(`[PROXY-CUSTOMER] Plugin still using hardcoded 'production-company' - using fallback`);
        companyId = '6a1d34d8-661b-4c81-be6f-bc144600b7d9'; // Fallback to the test company
      }
    }

    console.log(`[PROXY-CUSTOMER] Validating customer ${customerId} for company: ${companyId}`);

    // Get OAuth tokens
    const tokens = await getGoogleOAuthTokens(companyId);
    
    if (!tokens) {
      console.warn(`[PROXY-CUSTOMER] No valid Google tokens found for company: ${companyId}`);
      return Response.json({ 
        error: 'Google Ads not connected for this company',
        valid: false
      }, { status: 401 });
    }

    const accessToken = tokens.access_token;
    const developerToken = process.env.GOOGLE_ADS_DEVELOPER_TOKEN;

    console.log(`[PROXY-CUSTOMER] Validating customer ID: ${customerId}`);
    
    // Use searchStream to get customer details (same approach as campaigns endpoint)
    const query = `
      SELECT 
        customer.descriptive_name,
        customer.currency_code,
        customer.time_zone,
        customer.id,
        customer.manager
      FROM customer
      LIMIT 1
    `;
    
    const customerResponse = await fetch(`https://googleads.googleapis.com/v14/customers/${customerId}/googleAds:searchStream`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'developer-token': developerToken!,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query })
    });

    console.log(`[PROXY-CUSTOMER] Customer validation response status: ${customerResponse.status}`);

    if (!customerResponse.ok) {
      const error = await customerResponse.json().catch(async () => {
        const text = await customerResponse.text();
        return { message: text.substring(0, 200) };
      });
      console.error('[PROXY-CUSTOMER] Customer validation failed:', error);
      
      return Response.json({
        error: 'Customer ID validation failed',
        details: error,
        valid: false,
        customerId: customerId,
        message: `Customer ID ${customerId} is not accessible or does not exist`
      }, { status: customerResponse.status });
    }

    const customerData = await customerResponse.json();
    console.log(`[PROXY-CUSTOMER] Customer data:`, customerData);
    
    if (!customerData.results || customerData.results.length === 0) {
      return Response.json({
        error: 'No customer data found',
        valid: false,
        customerId: customerId,
        message: `Customer ID ${customerId} exists but no data returned`
      }, { status: 404 });
    }

    const customer = customerData.results[0].customer;
    const customerInfo: GoogleAdsCustomer = {
      customerId: customer.id,
      descriptiveName: customer.descriptiveName || `Account ${customer.id}`,
      currencyCode: customer.currencyCode || 'USD',
      timeZone: customer.timeZone || 'UTC',
      accountType: customer.manager ? 'MANAGER' : 'CLIENT',
      valid: true
    };

    console.log(`[PROXY-CUSTOMER] Successfully validated customer: ${customerInfo.descriptiveName}`);

    // Return validated customer info
    return Response.json({
      success: true,
      customer: customerInfo,
      valid: true,
      companyId: companyId
    });

  } catch (error) {
    console.error('[PROXY-CUSTOMER] Error:', error);
    return Response.json({ 
      error: 'Internal server error',
      valid: false
    }, { status: 500 });
  }
}