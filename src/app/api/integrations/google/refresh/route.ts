import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth';
import { createSupabaseServerClient } from '@/lib/supabaseServer';
import { encryptOAuthTokens, decryptOAuthTokens } from '@/lib/encryption';
import { auditLogger } from '@/lib/audit-logger';

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const authResult = await authenticateRequest(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { companyId, integrationId } = await request.json();

    if (!companyId || !integrationId) {
      return NextResponse.json(
        { error: 'Missing companyId or integrationId' },
        { status: 400 }
      );
    }

    const supabase = await createSupabaseServerClient();

    // Get the current integration
    const { data: integration, error: fetchError } = await supabase
      .from('company_integrations')
      .select('*')
      .eq('company_id', companyId)
      .eq('integration_id', integrationId)
      .single();

    if (fetchError || !integration) {
      return NextResponse.json(
        { error: 'Integration not found' },
        { status: 404 }
      );
    }

    // Decrypt current tokens
    let tokens;
    try {
      tokens = decryptOAuthTokens(integration.auth_data);
    } catch (error) {
      console.error('Failed to decrypt tokens:', error);
      return NextResponse.json(
        { error: 'Failed to decrypt tokens' },
        { status: 500 }
      );
    }

    if (!tokens.refresh_token) {
      return NextResponse.json(
        { error: 'No refresh token available' },
        { status: 400 }
      );
    }

    // Refresh the tokens
    const refreshResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        refresh_token: tokens.refresh_token,
        grant_type: 'refresh_token',
      }),
    });

    const newTokens = await refreshResponse.json();

    if (!refreshResponse.ok) {
      console.error('Token refresh failed:', newTokens);
      
      // If refresh token is invalid, mark integration as disconnected
      if (newTokens.error === 'invalid_grant') {
        await supabase
          .from('company_integrations')
          .update({
            status: 'disconnected',
            error_message: 'Refresh token expired. Please reconnect.',
          })
          .eq('id', integration.id);
      }

      return NextResponse.json(
        { error: 'Token refresh failed', details: newTokens.error },
        { status: 400 }
      );
    }

    // Update token data
    const updatedTokens = {
      access_token: newTokens.access_token,
      refresh_token: newTokens.refresh_token || tokens.refresh_token, // Keep old refresh token if new one not provided
      expires_at: newTokens.expires_in ? Date.now() + newTokens.expires_in * 1000 : undefined,
      scope: newTokens.scope || tokens.scope,
    };

    const encryptedTokens = encryptOAuthTokens(updatedTokens);

    // Update the integration
    const { error: updateError } = await supabase
      .from('company_integrations')
      .update({
        auth_data: encryptedTokens,
        status: 'connected',
        error_message: null,
        last_sync_at: new Date().toISOString(),
      })
      .eq('id', integration.id);

    if (updateError) {
      console.error('Failed to update integration:', updateError);
      return NextResponse.json(
        { error: 'Failed to update tokens' },
        { status: 500 }
      );
    }

    // Log the token refresh
    await auditLogger.logAuditEvent({
      table_name: 'company_integrations',
      operation: 'UPDATE',
      user_id: authResult.user.id,
      metadata: {
        action: 'google_tokens_refreshed',
        company_id: companyId,
        integration_id: integrationId,
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Token refresh error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}