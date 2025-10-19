import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth';
import { checkCompanyPermission } from '@/lib/auth';
import { auditLogger } from '@/lib/audit-logger';

const GOOGLE_OAUTH_SCOPES = [
  // User identification
  'https://www.googleapis.com/auth/userinfo.profile',
  'https://www.googleapis.com/auth/userinfo.email',
  
  // Google Ads - comprehensive access for campaigns, keywords, etc.
  'https://www.googleapis.com/auth/adwords',
  
  // Google Analytics - read access for reporting and data
  'https://www.googleapis.com/auth/analytics.readonly',
  
  // Google Sheets - for data export/import and reporting
  'https://www.googleapis.com/auth/spreadsheets',
  
  // Gmail - readonly for email marketing insights
  'https://www.googleapis.com/auth/gmail.readonly',
  
  // Google Search Console - SEO and search performance data
  'https://www.googleapis.com/auth/webmasters.readonly',
  
  // YouTube Analytics - for video marketing metrics
  'https://www.googleapis.com/auth/youtube.readonly',
  'https://www.googleapis.com/auth/yt-analytics.readonly',
  
  // Google My Business - local business metrics
  'https://www.googleapis.com/auth/business.manage',
  
  // Google Drive - for accessing shared reports and assets
  'https://www.googleapis.com/auth/drive.readonly'
];

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ companyId: string }> }
) {
  try {
    // Authenticate user
    const authResult = await authenticateRequest(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { companyId } = await params;

    // Check if user has permission to manage connections for this company
    const hasPermission = await checkCompanyPermission(
      authResult.user.id,
      companyId,
      ['admin', 'owner']
    );

    if (!hasPermission) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Generate OAuth URL
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const redirectUri = process.env.GOOGLE_REDIRECT_URI;

    if (!clientId || !redirectUri) {
      return NextResponse.json(
        { error: 'Google OAuth not configured' },
        { status: 500 }
      );
    }

    const state = Buffer.from(JSON.stringify({
      companyId,
      userId: authResult.user.id,
      timestamp: Date.now()
    })).toString('base64');

    const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    authUrl.searchParams.set('client_id', clientId);
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('scope', GOOGLE_OAUTH_SCOPES.join(' '));
    authUrl.searchParams.set('access_type', 'offline');
    authUrl.searchParams.set('prompt', 'consent');
    authUrl.searchParams.set('state', state);

    // Log the OAuth initiation
    await auditLogger.logAuditEvent({
      table_name: 'oauth_connections',
      operation: 'INSERT',
      user_id: authResult.user.id,
      metadata: {
        action: 'google_oauth_initiated',
        company_id: companyId,
        scopes: GOOGLE_OAUTH_SCOPES
      }
    });

    return NextResponse.json({ authUrl: authUrl.toString() });
  } catch (error) {
    console.error('Error initiating Google OAuth:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}