import { NextRequest } from 'next/server';
import { getGoogleOAuthTokens } from '@/lib/oauth-tokens';

/**
 * PROXY ENDPOINT FOR GOOGLE ADS CONNECTION STATUS
 * 
 * This endpoint checks the status of Google Ads API connection
 * Plugin expects: /api/proxy/google-ads/status?companyId=xyz
 */

export async function GET(request: NextRequest) {
  try {
    // Extract parameters from URL
    const { searchParams } = new URL(request.url);
    let companyId = searchParams.get('companyId');
    
    if (!companyId) {
      return Response.json({ error: 'companyId is required' }, { status: 400 });
    }

    // Handle hardcoded "production-company" from plugin - map to real company ID
    if (companyId === 'production-company') {
      // Try to get the real company ID from request headers
      const referer = request.headers.get('referer');

      if (referer) {
        const match = referer.match(/companies\/([a-f0-9-]+)\/apps/);
        if (match && match[1]) {
          companyId = match[1];
        }
      }

      // If still production-company, use fallback
      if (companyId === 'production-company') {
        companyId = '6a1d34d8-661b-4c81-be6f-bc144600b7d9'; // Fallback to the test company
      }
    }

    // Get OAuth tokens
    const tokens = await getGoogleOAuthTokens(companyId);
    
    if (!tokens) {
      return Response.json({
        connected: false,
        error: 'Google Ads not connected for this company',
        status: 'disconnected',
        details: 'No OAuth tokens found'
      }, { status: 200 }); // Return 200 for status checks
    }

    // Check if tokens include Google Ads scope
    const hasAdsScope = tokens.scope && tokens.scope.includes('https://www.googleapis.com/auth/adwords');
    const isExpired = tokens.expires_at && tokens.expires_at < Date.now();

    if (!hasAdsScope) {
      return Response.json({ 
        connected: false,
        error: 'Google Ads scope not granted',
        status: 'scope_missing',
        details: 'OAuth tokens do not include Google Ads (adwords) scope'
      }, { status: 200 });
    }

    if (isExpired) {
      return Response.json({ 
        connected: false,
        error: 'Google Ads tokens expired',
        status: 'expired',
        details: `Tokens expired at ${tokens.expires_at ? new Date(tokens.expires_at).toISOString() : 'unknown time'}`
      }, { status: 200 });
    }

    // For now, we know there are API access issues with the developer token
    // But we can still report that the OAuth connection is properly set up
    return Response.json({
      connected: true,
      status: 'connected_but_api_limited',
      details: {
        message: 'OAuth tokens are valid but Google Ads API access may be limited',
        hasAccessToken: !!tokens.access_token,
        hasRefreshToken: !!tokens.refresh_token,
        hasAdsScope: hasAdsScope,
        expiresAt: tokens.expires_at ? new Date(tokens.expires_at).toISOString() : null,
        issue: 'Google Ads Developer Token may not be approved for production use'
      }
    });

  } catch (error) {
    console.error('[PROXY-STATUS] Error:', error);
    return Response.json({ 
      connected: false,
      error: 'Internal server error',
      status: 'error'
    }, { status: 500 });
  }
}