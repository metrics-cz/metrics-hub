import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabaseServer';
import { decryptOAuthTokens } from '@/lib/encryption';

// Get OAuth tokens for a specific connection
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ companyId: string }> }
) {
  try {
    const { companyId } = await params;
    const { searchParams } = new URL(request.url);
    const connectionKey = searchParams.get('connectionKey'); // e.g., 'google'

    if (!connectionKey) {
      return NextResponse.json(
        { error: 'Connection key is required' }, 
        { status: 400 }
      );
    }

    const supabase = await createSupabaseServerClient();

    // Check authentication
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' }, 
        { status: 401 }
      );
    }

    // Find the connection and company connection
    const { data: companyConnection, error } = await supabase
      .from('company_connections')
      .select(`
        *,
        connection:connections(
          id,
          connection_key,
          name
        )
      `)
      .eq('company_id', companyId)
      .eq('connection.connection_key', connectionKey)
      .eq('status', 'connected')
      .single();

    if (error || !companyConnection) {
      return NextResponse.json(
        { error: 'Connection not found or not connected' }, 
        { status: 404 }
      );
    }

    // Get the encrypted tokens from secrets table
    const secretId = companyConnection.config?.secret_id;
    if (!secretId) {
      return NextResponse.json(
        { error: 'No tokens found for this connection' }, 
        { status: 404 }
      );
    }

    const { data: secret, error: secretError } = await supabase
      .from('secrets')
      .select('encrypted_value, key_version')
      .eq('id', secretId)
      .eq('company_id', companyId)
      .single();

    if (secretError || !secret) {
      return NextResponse.json(
        { error: 'Failed to retrieve tokens' }, 
        { status: 500 }
      );
    }

    // Decrypt the tokens
    let tokens;
    try {
      tokens = decryptOAuthTokens(secret.encrypted_value);
    } catch (decryptError) {
      console.error('Token decryption failed:', decryptError);
      return NextResponse.json(
        { error: 'Failed to decrypt tokens' }, 
        { status: 500 }
      );
    }

    // Check if tokens are expired and need refresh
    const now = Date.now();
    const expiresAt = tokens.expires_at;
    const isExpired = expiresAt && now >= expiresAt;

    if (isExpired && tokens.refresh_token) {
      // Try to refresh the tokens
      try {
        const refreshResponse = await refreshGoogleTokens(tokens.refresh_token);
        if (refreshResponse.success) {
          tokens = refreshResponse.tokens;
          
          // Store the new tokens
          const { encryptOAuthTokens } = await import('@/lib/encryption');
          const newEncryptedTokens = encryptOAuthTokens(tokens);
          
          await supabase
            .from('secrets')
            .update({
              encrypted_value: newEncryptedTokens,
              updated_at: new Date().toISOString()
            })
            .eq('id', secretId);
        }
      } catch (refreshError) {
        console.error('Token refresh failed:', refreshError);
        return NextResponse.json(
          { error: 'Tokens expired and refresh failed' }, 
          { status: 401 }
        );
      }
    }

    // Update last sync time
    await supabase
      .from('company_connections')
      .update({
        last_sync_at: new Date().toISOString(),
        sync_status: 'success'
      })
      .eq('id', companyConnection.id);

    // Return tokens and connection info
    return NextResponse.json({
      success: true,
      data: {
        connection: {
          id: companyConnection.id,
          name: companyConnection.name,
          provider: connectionKey,
          user_info: companyConnection.config?.user_info
        },
        tokens: {
          access_token: tokens.access_token,
          expires_at: tokens.expires_at,
          scope: tokens.scope
          // Note: We don't return refresh_token for security
        }
      }
    });

  } catch (error) {
    console.error('Connection tokens API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    );
  }
}

// Helper function to refresh Google tokens
async function refreshGoogleTokens(refreshToken: string) {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(`Token refresh failed: ${data.error}`);
  }

  return {
    success: true,
    tokens: {
      access_token: data.access_token,
      refresh_token: refreshToken, // Keep the existing refresh token
      expires_at: data.expires_in ? Date.now() + data.expires_in * 1000 : undefined,
      scope: data.scope,
    }
  };
}