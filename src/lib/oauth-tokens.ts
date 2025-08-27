import { createSupabaseServiceClient } from '@/lib/supabaseServer'
import { decryptOAuthTokens } from '@/lib/encryption'

export interface OAuthTokens {
  access_token: string
  refresh_token?: string
  expires_at?: number
  scope?: string
}

export interface TokenRefreshResult {
  access_token: string
  refresh_token?: string
  expires_at: number
  scope?: string
}

/**
 * Get Google OAuth tokens for a company from encrypted storage
 * 
 * @param companyId - The company ID
 * @returns Decrypted OAuth tokens or null if not found
 */
export async function getGoogleOAuthTokens(companyId: string): Promise<OAuthTokens | null> {
  try {
    const supabase = createSupabaseServiceClient()
    
    // Get the encrypted tokens from secrets table
    const secretKey = `google_oauth_tokens_${companyId.replace(/-/g, '_')}`
    
    const { data: secret, error } = await supabase
      .from('secrets')
      .select('encrypted_value')
      .eq('company_id', companyId)
      .eq('key', secretKey)
      .single()

    if (error || !secret) {
      console.warn(`[OAUTH-TOKENS] No Google tokens found for company ${companyId}:`, error?.message)
      return null
    }

    // Decrypt the tokens
    const tokens = decryptOAuthTokens(secret.encrypted_value)
    
    // Check if token is expired and needs refresh
    if (tokens.expires_at && Date.now() >= tokens.expires_at) {
      console.log(`[OAUTH-TOKENS] Access token expired for company ${companyId}, attempting refresh`)
      
      if (tokens.refresh_token) {
        const refreshedTokens = await refreshGoogleToken(companyId, tokens.refresh_token)
        if (refreshedTokens) {
          return refreshedTokens
        }
      }
      
      console.warn(`[OAUTH-TOKENS] Unable to refresh expired token for company ${companyId}`)
      return null
    }

    return tokens
  } catch (error) {
    console.error('[OAUTH-TOKENS] Error retrieving Google tokens:', error)
    return null
  }
}

/**
 * Refresh Google OAuth access token using refresh token
 * 
 * @param companyId - The company ID
 * @param refreshToken - The refresh token
 * @returns New tokens or null if refresh failed
 */
async function refreshGoogleToken(companyId: string, refreshToken: string): Promise<TokenRefreshResult | null> {
  try {
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
    })

    if (!response.ok) {
      const error = await response.json()
      console.error('[OAUTH-TOKENS] Token refresh failed:', error)
      return null
    }

    const newTokens = await response.json()
    
    // Calculate new expiry time
    const newTokenData: TokenRefreshResult = {
      access_token: newTokens.access_token,
      refresh_token: newTokens.refresh_token || refreshToken, // Use new refresh token if provided, otherwise keep old one
      expires_at: Date.now() + (newTokens.expires_in * 1000),
      scope: newTokens.scope
    }

    // Store the new tokens back to database
    await updateStoredGoogleTokens(companyId, newTokenData)
    
    console.log(`[OAUTH-TOKENS] Successfully refreshed tokens for company ${companyId}`)
    return newTokenData
  } catch (error) {
    console.error('[OAUTH-TOKENS] Error during token refresh:', error)
    return null
  }
}

/**
 * Update stored Google OAuth tokens in database
 * 
 * @param companyId - The company ID
 * @param tokens - The new token data
 */
async function updateStoredGoogleTokens(companyId: string, tokens: TokenRefreshResult): Promise<void> {
  try {
    const supabase = createSupabaseServiceClient()
    
    // Encrypt the new tokens
    const { encryptOAuthTokens } = await import('@/lib/encryption')
    const encryptedTokens = encryptOAuthTokens(tokens)
    
    const secretKey = `google_oauth_tokens_${companyId.replace(/-/g, '_')}`
    
    // Update the encrypted tokens in secrets table
    const { error } = await supabase
      .from('secrets')
      .update({ 
        encrypted_value: encryptedTokens,
        updated_at: new Date().toISOString()
      })
      .eq('company_id', companyId)
      .eq('key', secretKey)

    if (error) {
      console.error('[OAUTH-TOKENS] Failed to update stored tokens:', error)
      throw error
    }

    console.log(`[OAUTH-TOKENS] Successfully updated stored tokens for company ${companyId}`)
  } catch (error) {
    console.error('[OAUTH-TOKENS] Error updating stored tokens:', error)
    throw error
  }
}

/**
 * Validate that we can retrieve valid Google OAuth tokens for a company
 * 
 * @param companyId - The company ID
 * @returns true if valid tokens are available, false otherwise
 */
export async function hasValidGoogleTokens(companyId: string): Promise<boolean> {
  const tokens = await getGoogleOAuthTokens(companyId)
  return tokens !== null && !!tokens.access_token
}

/**
 * Get the Google user info associated with the stored tokens
 * This can be useful for validation and displaying connection status
 * 
 * @param companyId - The company ID
 * @returns Google user info or null if not available
 */
export async function getGoogleUserInfo(companyId: string): Promise<{
  email: string
  name: string
  picture?: string
  id: string
} | null> {
  const tokens = await getGoogleOAuthTokens(companyId)
  if (!tokens) return null

  try {
    const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        'Authorization': `Bearer ${tokens.access_token}`
      }
    })

    if (!response.ok) return null

    return await response.json()
  } catch (error) {
    console.error('[OAUTH-TOKENS] Error fetching Google user info:', error)
    return null
  }
}