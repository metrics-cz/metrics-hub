import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest, checkCompanyPermission } from '@/lib/auth';
import { createServerClient } from '@supabase/ssr';

// Trigger an integration manually
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ companyId: string; integrationId: string }> }
) {
  let companyId = 'unknown';
  let integrationId = 'unknown';

  try {
    const paramsResult = await params;
    companyId = paramsResult.companyId;
    integrationId = paramsResult.integrationId;

    // Authenticate request
    const authResult = await authenticateRequest(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json(
        { error: authResult.error || 'Authentication required' },
        { status: 401 }
      );
    }

    // Check company permission
    const permissionResult = await checkCompanyPermission(authResult.user.id, companyId);
    if (!permissionResult.hasPermission) {
      return NextResponse.json(
        { error: permissionResult.error || 'Access denied' },
        { status: 403 }
      );
    }

    // Create service role client for data access
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        cookies: {
          get: () => undefined,
          set: () => {},
          remove: () => {},
        },
      }
    );

    // Get the company application to verify it exists and is active
    const { data: companyApplication, error: caError } = await supabase
      .from('company_applications')
      .select(`
        id,
        company_id,
        application_id,
        is_active,
        is_enabled,
        config,
        application:applications(
          id,
          name,
          type,
          execution_type,
          integration_provider
        )
      `)
      .eq('id', integrationId)
      .eq('company_id', companyId)
      .single();

    if (caError || !companyApplication) {
      return NextResponse.json(
        { error: 'Integration not found or not installed for this company' },
        { status: 404 }
      );
    }

    // Verify it's a server-side integration
    const app = (companyApplication as any).application;
    if (!app || app.type !== 'integration' ||
        (app.execution_type !== 'server' && app.execution_type !== 'both')) {
      return NextResponse.json(
        { error: 'This integration cannot be triggered manually. Only server-side integrations can be run on-demand.' },
        { status: 400 }
      );
    }

    // Check if active and enabled
    if (!companyApplication.is_active || !companyApplication.is_enabled) {
      return NextResponse.json(
        { error: 'Integration is not active or enabled' },
        { status: 400 }
      );
    }

    // Parse optional config override from request body
    const body = await request.json().catch(() => ({}));
    const configOverride = body.config || {};

    // Call executor server to trigger the job
    const executorServerUrl = process.env.NEXT_PUBLIC_EXECUTOR_SERVER_URL || 'http://localhost:3001';

    const triggerResponse = await fetch(`${executorServerUrl}/api/jobs/trigger`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        companyApplicationId: companyApplication.id,
        userId: authResult.user.id,
        config: configOverride,
      }),
    });

    if (!triggerResponse.ok) {
      const errorData = await triggerResponse.json().catch(() => ({}));
      console.error('Executor server error:', errorData);

      return NextResponse.json(
        {
          error: 'Failed to trigger integration',
          details: errorData.error || 'Executor server returned an error',
        },
        { status: triggerResponse.status }
      );
    }

    const result = await triggerResponse.json();

    return NextResponse.json({
      success: true,
      message: `Integration ${app.name} triggered successfully`,
      data: {
        jobId: result.data?.jobId,
        companyApplicationId: result.data?.companyApplicationId,
        status: result.data?.status || 'queued',
      },
    });

  } catch (error) {
    console.error('Trigger integration API error:', {
      error,
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      companyId,
      integrationId,
    });

    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error occurred'
      },
      { status: 500 }
    );
  }
}
