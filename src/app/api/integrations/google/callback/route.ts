import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServiceClient } from '@/lib/supabaseServer';
import { encryptOAuthTokens } from '@/lib/encryption';
import { auditLogger } from '@/lib/audit-logger';

export async function GET(request: NextRequest) {
  console.log('[OAUTH-CALLBACK] Google OAuth callback initiated');
  console.log('[OAUTH-CALLBACK] Request URL:', request.url);
  
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    console.log('[OAUTH-CALLBACK] URL parameters:', { 
      hasCode: !!code, 
      hasState: !!state, 
      error: error || 'none' 
    });

    if (error) {
      console.error('[OAUTH-CALLBACK] OAuth error from Google:', error);
      return NextResponse.redirect(
        new URL(`/en/companies/settings?tab=integrations&error=${encodeURIComponent(error)}`, request.url)
      );
    }

    if (!code || !state) {
      console.error('[OAUTH-CALLBACK] Missing required parameters:', { code: !!code, state: !!state });
      return NextResponse.redirect(
        new URL('/en/companies/settings?tab=integrations&error=missing_parameters', request.url)
      );
    }

    // Decode state to get company and user info
    let stateData;
    try {
      stateData = JSON.parse(Buffer.from(state, 'base64').toString());
      console.log('[OAUTH-CALLBACK] Decoded state data:', { 
        companyId: stateData.companyId, 
        userId: stateData.userId, 
        timestamp: stateData.timestamp 
      });
    } catch (stateError) {
      console.error('[OAUTH-CALLBACK] Failed to decode state:', stateError);
      return NextResponse.redirect(
        new URL('/en/companies/settings?tab=integrations&error=invalid_state', request.url)
      );
    }

    const { companyId, userId, timestamp } = stateData;

    // Check if state is not too old (15 minutes)
    const stateAge = Date.now() - timestamp;
    console.log('[OAUTH-CALLBACK] State age check:', { stateAge, maxAge: 15 * 60 * 1000, isExpired: stateAge > 15 * 60 * 1000 });
    
    if (stateAge > 15 * 60 * 1000) {
      console.error('[OAUTH-CALLBACK] State expired:', { stateAge, timestamp });
      return NextResponse.redirect(
        new URL(`/en/companies/${companyId}/settings?tab=integrations&error=expired_state`, request.url)
      );
    }

    // Exchange authorization code for tokens
    console.log('[OAUTH-CALLBACK] Starting token exchange with Google');
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
    
    console.log('[OAUTH-CALLBACK] Token exchange response:', { 
      success: tokenResponse.ok, 
      status: tokenResponse.status,
      hasAccessToken: !!tokens.access_token,
      hasRefreshToken: !!tokens.refresh_token,
      expiresIn: tokens.expires_in,
      scope: tokens.scope
    });

    if (!tokenResponse.ok) {
      console.error('[OAUTH-CALLBACK] Token exchange failed:', tokens);
      return NextResponse.redirect(
        new URL(`/en/companies/${companyId}/settings?tab=integrations&error=token_exchange_failed`, request.url)
      );
    }

    // Get user info from Google
    console.log('[OAUTH-CALLBACK] Fetching user info from Google');
    const userInfoResponse = await fetch(
      'https://www.googleapis.com/oauth2/v2/userinfo',
      {
        headers: {
          Authorization: `Bearer ${tokens.access_token}`,
        },
      }
    );

    const userInfo = await userInfoResponse.json();
    
    console.log('[OAUTH-CALLBACK] User info response:', { 
      success: userInfoResponse.ok,
      status: userInfoResponse.status,
      email: userInfo.email,
      name: userInfo.name,
      id: userInfo.id
    });

    if (!userInfoResponse.ok) {
      console.error('[OAUTH-CALLBACK] Failed to get user info:', userInfo);
      return NextResponse.redirect(
        new URL(`/en/companies/${companyId}/settings?tab=integrations&error=user_info_failed`, request.url)
      );
    }

    // Find or create Google connection
    console.log('[OAUTH-CALLBACK] Looking up Google connection in database');
    const supabase = createSupabaseServiceClient();
    const { data: connection, error: connectionError } = await supabase
      .from('connections')
      .select('id')
      .eq('connection_key', 'google')
      .single();

    console.log('[OAUTH-CALLBACK] Connection lookup result:', { 
      found: !!connection, 
      connectionId: connection?.id,
      error: connectionError?.message || 'none'
    });

    if (!connection) {
      console.error('[OAUTH-CALLBACK] Google connection not found in database:', connectionError);
      return NextResponse.redirect(
        new URL(`/en/companies/${companyId}/settings?tab=integrations&error=connection_not_found`, request.url)
      );
    }

    // Prepare token data for encryption
    console.log('[OAUTH-CALLBACK] Preparing tokens for encryption');
    const tokenData = {
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_at: tokens.expires_in ? Date.now() + tokens.expires_in * 1000 : undefined,
      scope: tokens.scope,
    };

    console.log('[OAUTH-CALLBACK] Token data prepared:', {
      hasAccessToken: !!tokenData.access_token,
      hasRefreshToken: !!tokenData.refresh_token,
      expiresAt: tokenData.expires_at,
      scopeCount: tokenData.scope?.split(' ').length || 0,
      accessTokenLength: tokenData.access_token?.length || 0,
      refreshTokenLength: tokenData.refresh_token?.length || 0,
      scopesList: tokenData.scope?.split(' ') || []
    });
    
   
    const encryptedTokens = encryptOAuthTokens(tokenData);

    // Store encrypted tokens in secrets table
    console.log('[OAUTH-CALLBACK] Storing encrypted tokens in secrets table');
    const secretKey = `google_oauth_tokens_${companyId.replace(/-/g, '_')}`;
    console.log('[OAUTH-CALLBACK] Secret key:', secretKey);
    
    const { data: secret, error: secretError } = await supabase
      .from('secrets')
      .upsert({
        company_id: companyId,
        key: secretKey,
        encrypted_value: encryptedTokens,
        key_version: 1,
        description: `Google OAuth tokens for company ${companyId}`,
        app_permissions: [],
        created_by: userId
      }, {
        onConflict: 'company_id,key'
      })
      .select('id')
      .single();

    console.log('[OAUTH-CALLBACK] Secrets table operation result:', {
      success: !!secret && !secretError,
      secretId: secret?.id,
      error: secretError?.message || 'none',
      errorCode: secretError?.code || 'none'
    });

    if (secretError) {
      console.error('[OAUTH-CALLBACK] Failed to store tokens in secrets table:', secretError);
      return NextResponse.redirect(
        new URL(`/en/companies/${companyId}/settings?tab=integrations&error=token_storage_failed`, request.url)
      );
    }

    // Store the connection
    console.log('[OAUTH-CALLBACK] Storing connection in company_connections table');
    const connectionData = {
      company_id: companyId,
      connection_id: connection.id,
      name: `Google Account (${userInfo.email})`,
      status: 'connected',
      connected_at: new Date().toISOString(),
      connected_by: userId,
      config: {
        user_info: {
          email: userInfo.email,
          name: userInfo.name,
          picture: userInfo.picture,
          google_id: userInfo.id,
        },
        secret_id: secret.id,
        scopes: tokens.scope?.split(' ') || []
      },
      last_sync_at: new Date().toISOString(),
      sync_status: 'success'
    };
    
    console.log('[OAUTH-CALLBACK] Connection data to store:', {
      companyId,
      connectionId: connection.id,
      email: userInfo.email,
      secretId: secret.id,
      scopesCount: connectionData.config.scopes.length
    });

    const { error: insertError } = await supabase
      .from('company_connections')
      .upsert(connectionData, {
        onConflict: 'company_id,connection_id'
      });

    console.log('[OAUTH-CALLBACK] Company connections table operation result:', {
      success: !insertError,
      error: insertError?.message || 'none',
      errorCode: insertError?.code || 'none'
    });

    if (insertError) {
      console.error('[OAUTH-CALLBACK] Failed to store connection:', insertError);
      return NextResponse.redirect(
        new URL(`/en/companies/${companyId}/settings?tab=integrations&error=storage_failed`, request.url)
      );
    }

    // Log successful connection
    console.log('[OAUTH-CALLBACK] Logging audit event');
    await auditLogger.logAuditEvent({
      table_name: 'company_connections',
      operation: 'INSERT',
      user_id: userId,
      metadata: {
        action: 'google_oauth_completed',
        company_id: companyId,
        google_email: userInfo.email,
        scopes: tokens.scope,
        connection_id: connection.id
      }
    });

    // Redirect to success page
    console.log('[OAUTH-CALLBACK] OAuth flow completed successfully, redirecting to settings');
    const successUrl = `/en/companies/${companyId}/settings?tab=integrations&success=google_connected`;
    console.log('[OAUTH-CALLBACK] Success redirect URL:', successUrl);
    
    return NextResponse.redirect(
      new URL(successUrl, request.url)
    );
  } catch (error) {
    console.error('[OAUTH-CALLBACK] Unexpected error in OAuth callback:', error);
    console.error('[OAUTH-CALLBACK] Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    return NextResponse.redirect(
      new URL('/en/companies/settings?tab=integrations&error=callback_failed', request.url)
    );
  }
}