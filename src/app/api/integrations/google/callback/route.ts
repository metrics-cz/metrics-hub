import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServiceClient } from '@/lib/supabaseServer';
import { encryptOAuthTokens } from '@/lib/encryption';
import { auditLogger } from '@/lib/audit-logger';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    if (error) {
      console.error('OAuth error:', error);
      return NextResponse.redirect(
        new URL(`/en/companies/settings?tab=integrations&error=${encodeURIComponent(error)}`, request.url)
      );
    }

    if (!code || !state) {
      return NextResponse.redirect(
        new URL('/en/companies/settings?tab=integrations&error=missing_parameters', request.url)
      );
    }

    // Decode state to get company and user info
    let stateData;
    try {
      stateData = JSON.parse(Buffer.from(state, 'base64').toString());
    } catch {
      return NextResponse.redirect(
        new URL('/en/companies/settings?tab=integrations&error=invalid_state', request.url)
      );
    }

    const { companyId, userId, timestamp } = stateData;

    // Check if state is not too old (15 minutes)
    if (Date.now() - timestamp > 15 * 60 * 1000) {
      return NextResponse.redirect(
        new URL(`/en/companies/${companyId}/settings?tab=integrations&error=expired_state`, request.url)
      );
    }

    // Exchange authorization code for tokens
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        code,
        grant_type: 'authorization_code',
        redirect_uri: process.env.GOOGLE_REDIRECT_URI!,
      }),
    });

    const tokens = await tokenResponse.json();

    if (!tokenResponse.ok) {
      console.error('Token exchange failed:', tokens);
      return NextResponse.redirect(
        new URL(`/en/companies/${companyId}/settings?tab=integrations&error=token_exchange_failed`, request.url)
      );
    }

    // Get user info from Google
    const userInfoResponse = await fetch(
      'https://www.googleapis.com/oauth2/v2/userinfo',
      {
        headers: {
          Authorization: `Bearer ${tokens.access_token}`,
        },
      }
    );

    const userInfo = await userInfoResponse.json();

    if (!userInfoResponse.ok) {
      console.error('Failed to get user info:', userInfo);
      return NextResponse.redirect(
        new URL(`/en/companies/${companyId}/settings?tab=integrations&error=user_info_failed`, request.url)
      );
    }

    // Find or create Google integration
    const supabase = createSupabaseServiceClient();
    const { data: integration } = await supabase
      .from('integrations')
      .select('id')
      .eq('integration_key', 'google')
      .single();

    if (!integration) {
      return NextResponse.redirect(
        new URL(`/en/companies/${companyId}/settings?tab=integrations&error=integration_not_found`, request.url)
      );
    }

    // Prepare token data for encryption
    const tokenData = {
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_at: tokens.expires_in ? Date.now() + tokens.expires_in * 1000 : undefined,
      scope: tokens.scope,
    };

    const encryptedTokens = encryptOAuthTokens(tokenData);

    // Store the integration
    const { error: insertError } = await supabase
      .from('company_integrations')
      .upsert({
        company_id: companyId,
        integration_id: integration.id,
        name: `Google Account (${userInfo.email})`,
        status: 'connected',
        connected_at: new Date().toISOString(),
        connected_by: userId,
        auth_data: encryptedTokens,
        config: {
          user_info: {
            email: userInfo.email,
            name: userInfo.name,
            picture: userInfo.picture,
            google_id: userInfo.id,
          },
        },
      }, {
        onConflict: 'company_id,integration_id'
      });

    if (insertError) {
      console.error('Failed to store integration:', insertError);
      return NextResponse.redirect(
        new URL(`/en/companies/${companyId}/settings?tab=integrations&error=storage_failed`, request.url)
      );
    }

    // Log successful integration
    await auditLogger.logAuditEvent({
      table_name: 'company_integrations',
      operation: 'INSERT',
      user_id: userId,
      metadata: {
        action: 'google_oauth_completed',
        company_id: companyId,
        google_email: userInfo.email,
        scopes: tokens.scope,
      }
    });

    // Redirect to success page
    return NextResponse.redirect(
      new URL(`/en/companies/${companyId}/settings?tab=integrations&success=google_connected`, request.url)
    );
  } catch (error) {
    console.error('Callback error:', error);
    return NextResponse.redirect(
      new URL('/en/companies/settings?tab=integrations&error=callback_failed', request.url)
    );
  }
}