import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest, checkCompanyPermission } from '@/lib/auth';
import { createServerClient } from '@supabase/ssr';

// Get installed applications for a company
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ companyId: string }> }
) {
  try {
    const { companyId } = await params;
    
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

    const { data: companyApplications, error } = await supabase
      .from('company_applications')
      .select(`
        *,
        application:applications(
          id,
          name,
          description,
          category,
          developer,
          version,
          icon_url,
          rating,
          download_count,
          is_premium,
          price,
          features,
          tags
        )
      `)
      .eq('company_id', companyId)
      .eq('is_active', true)
      .order('installed_at', { ascending: false });

    if (error) {
      console.error('Error fetching company applications:', error);
      return NextResponse.json(
        { error: 'Failed to fetch company applications', details: error.message }, 
        { status: 500 }
      );
    }


    return NextResponse.json({
      success: true,
      data: companyApplications || []
    });

  } catch (error) {
    console.error('Company applications API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    );
  }
}

// Install an application for a company
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ companyId: string }> }
) {
  try {
    const { companyId } = await params;
    const body = await request.json();
    const { applicationId, configuration = {}, settings = {} } = body;

    if (!applicationId) {
      return NextResponse.json(
        { error: 'Application ID is required' }, 
        { status: 400 }
      );
    }

    // Authenticate request
    const authResult = await authenticateRequest(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json(
        { error: authResult.error || 'Authentication required' },
        { status: 401 }
      );
    }

    // Check company permission (require admin role for installations)
    const permissionResult = await checkCompanyPermission(
      authResult.user.id, 
      companyId, 
      ['admin', 'owner', 'superadmin']
    );
    if (!permissionResult.hasPermission) {
      return NextResponse.json(
        { error: permissionResult.error || 'Admin access required to install applications' },
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

    // Check if application exists and is active
    const { data: application, error: appError } = await supabase
      .from('applications')
      .select('id, name, is_active, download_count')
      .eq('id', applicationId)
      .eq('is_active', true)
      .single();

    if (appError || !application) {
      return NextResponse.json(
        { error: 'Application not found or inactive' }, 
        { status: 404 }
      );
    }

    // Check if already installed
    const { data: existing, error: existingError } = await supabase
      .from('company_applications')
      .select('id')
      .eq('company_id', companyId)
      .eq('application_id', applicationId)
      .single();

    if (existing) {
      return NextResponse.json(
        { error: 'Application already installed' }, 
        { status: 409 }
      );
    }

    // If there was an error other than "no rows returned", handle it
    if (existingError && existingError.code !== 'PGRST116') {
      console.error('Error checking existing installation:', existingError);
      return NextResponse.json(
        { error: 'Failed to check installation status' }, 
        { status: 500 }
      );
    }

    // Install the application
    const { data: installation, error: installError } = await supabase
      .from('company_applications')
      .insert({
        company_id: companyId,
        application_id: applicationId,
        installed_by: authResult.user.id,
        configuration,
        settings,
        is_active: true
      })
      .select(`
        *,
        application:applications(
          id,
          name,
          description,
          category,
          developer,
          version,
          icon_url,
          rating,
          download_count,
          is_premium,
          price,
          features,
          tags
        )
      `)
      .single();

    if (installError) {
      console.error('Error installing application:', installError);
      
      // Handle specific error cases
      if (installError.code === '42501') {
        return NextResponse.json(
          { error: 'You do not have permission to install applications for this company. Please ensure you are a member of this company.' }, 
          { status: 403 }
        );
      }
      
      if (installError.code === '23505') {
        return NextResponse.json(
          { error: 'This application is already installed for this company.' }, 
          { status: 409 }
        );
      }
      
      return NextResponse.json(
        { error: 'Failed to install application', details: installError.message, code: installError.code }, 
        { status: 500 }
      );
    }

    // Update download count
    await supabase
      .from('applications')
      .update({ 
        download_count: application.download_count + 1 
      })
      .eq('id', applicationId);

    return NextResponse.json({
      success: true,
      message: `${application.name} installed successfully`,
      data: installation
    });

  } catch (error) {
    console.error('Install application API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    );
  }
}