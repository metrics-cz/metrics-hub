import { NextRequest, NextResponse } from 'next/server';
import { getGoogleOAuthTokens } from '@/lib/oauth-tokens';

interface RouteContext {
  params: Promise<{
    companyId: string;
  }>;
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { companyId } = await context.params;

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(companyId)) {
      return NextResponse.json(
        { error: 'Invalid company ID format' },
        { status: 400 }
      );
    }

    // Get OAuth tokens for the company
    const tokens = await getGoogleOAuthTokens(companyId);

    if (!tokens) {
      return NextResponse.json(
        { error: 'No OAuth tokens found for company' },
        { status: 404 }
      );
    }

    // Return tokens (they're already decrypted by getGoogleOAuthTokens)
    return NextResponse.json({
      access_token: tokens.access_token,
      expires_at: tokens.expires_at,
      scope: tokens.scope,
      // Don't include refresh_token for security
    });

  } catch (error) {
    console.error('Error fetching OAuth tokens:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}