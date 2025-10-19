/**
 * Google Ads MCC Child Accounts API
 *
 * This endpoint implements the Funnel.io/Make.com pattern for accessing child accounts
 * through parent MCC credentials using the login-customer-id header.
 */

import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { companyId, mccCustomerId, useParentCredentials } = body;

    if (!companyId || !mccCustomerId) {
      return NextResponse.json(
        { success: false, error: 'companyId and mccCustomerId are required' },
        { status: 400 }
      );
    }

    console.log(`[MCC-CHILDREN] Fetching child accounts for MCC ${mccCustomerId}`);

    // Get company's Google OAuth tokens
    const tokenResponse = await fetch(`${process.env.NEXTAUTH_URL}/api/companies/${companyId}/oauth-tokens`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    });

    if (!tokenResponse.ok) {
      return NextResponse.json(
        { success: false, error: 'Failed to get OAuth tokens' },
        { status: 401 }
      );
    }

    const tokens = await tokenResponse.json();
    if (!tokens.google_access_token) {
      return NextResponse.json(
        { success: false, error: 'No Google access token available' },
        { status: 401 }
      );
    }

    // Build Google Ads API request for MCC child accounts
    const googleAdsApiUrl = `https://googleads.googleapis.com/v16/customers/${mccCustomerId}/customerClients`;

    const headers: Record<string, string> = {
      'Authorization': `Bearer ${tokens.google_access_token}`,
      'Content-Type': 'application/json',
    };

    // Key: Use parent MCC credentials for accessing child accounts (Funnel.io pattern)
    if (useParentCredentials) {
      headers['login-customer-id'] = mccCustomerId;
    }

    console.log(`[MCC-CHILDREN] Making request to Google Ads API with MCC credentials`);

    const googleResponse = await fetch(googleAdsApiUrl, {
      method: 'GET',
      headers
    });

    if (!googleResponse.ok) {
      const errorText = await googleResponse.text();
      console.error(`[MCC-CHILDREN] Google Ads API error:`, errorText);

      return NextResponse.json(
        {
          success: false,
          error: `Google Ads API error: ${googleResponse.status}`,
          details: errorText
        },
        { status: googleResponse.status }
      );
    }

    const data = await googleResponse.json();

    // Transform Google Ads API response to our format
    const childAccounts = (data.results || []).map((result: any) => {
      const client = result.customerClient;
      return {
        customerId: client.id?.toString(),
        descriptiveName: client.descriptiveName || `Account ${client.id}`,
        manager: client.manager || false,
        status: client.status || 'ENABLED',
        currencyCode: client.currencyCode || 'USD',
        timeZone: client.timeZone || 'UTC',
        testAccount: client.testAccount || false
      };
    });

    console.log(`[MCC-CHILDREN] Found ${childAccounts.length} child accounts for MCC ${mccCustomerId}`);

    return NextResponse.json({
      success: true,
      accounts: childAccounts,
      total: childAccounts.length,
      mccCustomerId,
      accessMethod: useParentCredentials ? 'parent_mcc_credentials' : 'direct'
    });

  } catch (error) {
    console.error('[MCC-CHILDREN] Error:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get MCC child accounts'
      },
      { status: 500 }
    );
  }
}