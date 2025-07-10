import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabaseServer';

// Get company's connected integrations
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

    const { data: companyIntegrations, error } = await supabase
      .from('company_integrations')
      .select(`
        *,
        integration:integrations(*)
      `)
      .eq('company_id', companyId)
      .order('connected_at', { ascending: false });

    if (error) {
      console.error('Error fetching company integrations:', error);
      return NextResponse.json(
        { error: 'Failed to fetch company integrations', details: error.message }, 
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: companyIntegrations || []
    });

  } catch (error) {
    console.error('Company integrations API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    );
  }
}

// Connect a new integration for a company
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ companyId: string }> }
) {
  try {
    const { companyId } = await params;
    const body = await request.json();
    const { integrationId, config = {}, authData = {} } = body;

    if (!integrationId) {
      return NextResponse.json(
        { error: 'Integration ID is required' }, 
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

    // Check if integration exists and is active
    const { data: integration, error: integrationError } = await supabase
      .from('integrations')
      .select('id, name, is_active')
      .eq('id', integrationId)
      .eq('is_active', true)
      .single();

    if (integrationError || !integration) {
      return NextResponse.json(
        { error: 'Integration not found or inactive' }, 
        { status: 404 }
      );
    }

    // Check if already connected
    const { data: existing, error: existingError } = await supabase
      .from('company_integrations')
      .select('id')
      .eq('company_id', companyId)
      .eq('integration_id', integrationId)
      .single();

    if (existing) {
      return NextResponse.json(
        { error: 'Integration already connected' }, 
        { status: 409 }
      );
    }

    // If there was an error other than "no rows returned", handle it
    if (existingError && existingError.code !== 'PGRST116') {
      console.error('Error checking existing integration:', existingError);
      return NextResponse.json(
        { error: 'Failed to check integration status' }, 
        { status: 500 }
      );
    }

    // Connect the integration
    const { data: connection, error: connectError } = await supabase
      .from('company_integrations')
      .insert({
        company_id: companyId,
        integration_id: integrationId,
        connected_by: user.id,
        config,
        auth_data: authData,
        status: 'active'
      })
      .select(`
        *,
        integration:integrations(*)
      `)
      .single();

    if (connectError) {
      console.error('Error connecting integration:', connectError);
      return NextResponse.json(
        { error: 'Failed to connect integration', details: connectError.message }, 
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `${integration.name} connected successfully`,
      data: connection
    });

  } catch (error) {
    console.error('Connect integration API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    );
  }
}