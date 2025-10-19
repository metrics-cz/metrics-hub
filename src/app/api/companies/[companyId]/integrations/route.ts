import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabaseServer';
import { auditLogger } from '@/lib/audit-logger';

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
      .from('company_applications')
      .select(`
        *,
        application:applications(
          id,
          name,
          description,
          category_id,
          type,
          developer,
          version,
          icon_url,
          is_premium,
          price,
          features,
          tags,
          execution_type,
          integration_provider
        )
      `)
      .eq('company_id', companyId)
      .eq('is_active', true)
      .eq('application.type', 'integration')
      .order('installed_at', { ascending: false });

    if (error) {
      console.error('Error fetching company integrations:', {
        error,
        message: error?.message,
        code: error?.code,
        details: error?.details,
        hint: error?.hint,
        companyId
      });
      
      // Ensure details is always a string, never an object
      const detailsString = String(error?.message || error?.code || error || 'Unknown database error');
      
      return NextResponse.json(
        { 
          error: 'Failed to fetch company integrations', 
          details: detailsString,
          errorCode: String(error?.code || 'unknown'),
          hint: String(error?.hint || 'No additional hints available')
        }, 
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

    // Check if application exists and is active and is an integration
    const { data: application, error: applicationError } = await supabase
      .from('applications')
      .select('id, name, type, is_active')
      .eq('id', integrationId)
      .eq('is_active', true)
      .eq('type', 'integration')
      .single();

    if (applicationError || !application) {
      return NextResponse.json(
        { error: 'Integration not found or inactive' }, 
        { status: 404 }
      );
    }

    // Check if already installed
    const { data: existing, error: existingError } = await supabase
      .from('company_applications')
      .select('id')
      .eq('company_id', companyId)
      .eq('application_id', integrationId)
      .single();

    if (existing) {
      return NextResponse.json(
        { error: 'Integration already installed' }, 
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

    // Install the integration
    const { data: installation, error: installError } = await supabase
      .from('company_applications')
      .insert({
        company_id: companyId,
        application_id: integrationId,
        installed_by: user.id,
        config,
        settings: authData,
        is_active: true
      })
      .select(`
        *,
        application:applications(*)
      `)
      .single();

    if (installError) {
      console.error('Error installing integration:', installError);
      return NextResponse.json(
        { error: 'Failed to install integration', details: installError.message }, 
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `${application.name} installed successfully`,
      data: installation
    });

  } catch (error) {
    console.error('Connect integration API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    );
  }
}

// Disconnect an integration for a company
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ companyId: string }> }
) {
  try {
    const { companyId } = await params;
    const { searchParams } = new URL(request.url);
    const integrationId = searchParams.get('integrationId');

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

    // Get the integration before deleting for audit log
    const { data: installation, error: fetchError } = await supabase
      .from('company_applications')
      .select(`
        *,
        application:applications(name)
      `)
      .eq('company_id', companyId)
      .eq('application_id', integrationId)
      .single();

    if (fetchError || !installation) {
      return NextResponse.json(
        { error: 'Integration not found' }, 
        { status: 404 }
      );
    }

    // Delete the integration
    const { error: deleteError } = await supabase
      .from('company_applications')
      .delete()
      .eq('company_id', companyId)
      .eq('application_id', integrationId);

    if (deleteError) {
      console.error('Error disconnecting integration:', deleteError);
      return NextResponse.json(
        { error: 'Failed to disconnect integration', details: deleteError.message }, 
        { status: 500 }
      );
    }

    // Log the disconnection
    await auditLogger.logAuditEvent({
      table_name: 'company_applications',
      operation: 'DELETE',
      user_id: user.id,
      metadata: {
        action: 'integration_uninstalled',
        company_id: companyId,
        integration_name: installation.application?.name,
        integration_id: integrationId,
      }
    });

    return NextResponse.json({
      success: true,
      message: `${installation.application?.name || 'Integration'} uninstalled successfully`
    });

  } catch (error) {
    console.error('Disconnect integration API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    );
  }
}