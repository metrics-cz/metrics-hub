import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabaseServer';

// Get company's automations
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ companyId: string }> }
) {
  try {
    const { companyId } = await params;
    const supabase = await createSupabaseServerClient();

    // Check authentication
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' }, 
        { status: 401 }
      );
    }

    const { data: companyAutomations, error } = await supabase
      .from('company_automations')
      .select(`
        *,
        automation:automations(*),
        integration:company_integrations(
          *,
          integration:integrations(*)
        )
      `)
      .eq('company_id', companyId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching company automations:', error);
      return NextResponse.json(
        { error: 'Failed to fetch company automations', details: error.message }, 
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: companyAutomations || []
    });

  } catch (error) {
    console.error('Company automations API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    );
  }
}

// Create a new automation for a company
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ companyId: string }> }
) {
  try {
    const { companyId } = await params;
    const body = await request.json();
    const { 
      automationId, 
      integrationId = null, 
      frequency = '24h',
      metricsWatched = [],
      periodDays = 7,
      notificationChannels = {},
      config = {}
    } = body;

    if (!automationId) {
      return NextResponse.json(
        { error: 'Automation ID is required' }, 
        { status: 400 }
      );
    }

    const supabase = await createSupabaseServerClient();
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' }, 
        { status: 401 }
      );
    }

    // Check if automation exists and is active
    const { data: automation, error: automationError } = await supabase
      .from('automations')
      .select('*')
      .eq('id', automationId)
      .eq('is_active', true)
      .single();

    if (automationError || !automation) {
      return NextResponse.json(
        { error: 'Automation not found or inactive' }, 
        { status: 404 }
      );
    }

    // Check if already installed
    const { data: existing, error: existingError } = await supabase
      .from('company_automations')
      .select('id')
      .eq('company_id', companyId)
      .eq('automation_id', automationId)
      .single();

    if (existing) {
      return NextResponse.json(
        { error: 'Automation already installed' }, 
        { status: 409 }
      );
    }

    // If there was an error other than "no rows returned", handle it
    if (existingError && existingError.code !== 'PGRST116') {
      console.error('Error checking existing automation:', existingError);
      return NextResponse.json(
        { error: 'Failed to check automation status' }, 
        { status: 500 }
      );
    }

    // Calculate price based on frequency
    const pricingConfig = automation.pricing_config as any || {};
    const pricePerMonth = pricingConfig[frequency] || 20;

    // Install the automation
    const { data: installation, error: installError } = await supabase
      .from('company_automations')
      .insert({
        company_id: companyId,
        automation_id: automationId,
        integration_id: integrationId,
        created_by: user.id,
        frequency,
        metrics_watched: metricsWatched,
        period_days: periodDays,
        price_per_month: pricePerMonth,
        notification_channels: notificationChannels,
        config,
        is_active: false // Start as inactive, user can activate later
      })
      .select(`
        *,
        automation:automations(*),
        integration:company_integrations(
          *,
          integration:integrations(*)
        )
      `)
      .single();

    if (installError) {
      console.error('Error installing automation:', installError);
      return NextResponse.json(
        { error: 'Failed to install automation', details: installError.message }, 
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `${automation.name} installed successfully`,
      data: installation
    });

  } catch (error) {
    console.error('Install automation API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    );
  }
}