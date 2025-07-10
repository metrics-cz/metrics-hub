import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabaseServer';

interface RouteParams {
  companyId: string;
  appId: string;
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<RouteParams> }
) {
  try {
    const { companyId, appId } = await params;
    const { settings } = await request.json();

    if (!companyId || !appId) {
      return NextResponse.json(
        { success: false, error: 'Missing company ID or application ID' },
        { status: 400 }
      );
    }

    if (!settings) {
      return NextResponse.json(
        { success: false, error: 'Settings data is required' },
        { status: 400 }
      );
    }

    const supabase = await createSupabaseServerClient();

    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Verify user has access to this company
    const { data: companyUser, error: companyError } = await supabase
      .from('company_users')
      .select('role')
      .eq('company_id', companyId)
      .eq('user_id', user.id)
      .single();

    if (companyError || !companyUser) {
      return NextResponse.json(
        { success: false, error: 'Access denied to this company' },
        { status: 403 }
      );
    }

    // Check if user has permission to update settings (admin, superadmin, or owner)
    const allowedRoles = ['admin', 'superadmin', 'owner'];
    if (!allowedRoles.includes(companyUser.role)) {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions to update settings' },
        { status: 403 }
      );
    }

    // Update the application settings
    const { data: updatedApplication, error: updateError } = await supabase
      .from('company_applications')
      .update({
        settings: settings,
        updated_at: new Date().toISOString()
      })
      .eq('company_id', companyId)
      .eq('application_id', appId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating application settings:', updateError);
      return NextResponse.json(
        { success: false, error: 'Failed to update application settings' },
        { status: 500 }
      );
    }

    if (!updatedApplication) {
      return NextResponse.json(
        { success: false, error: 'Application installation not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Settings updated successfully',
      data: updatedApplication
    });

  } catch (error) {
    console.error('Error in PUT /api/company/[companyId]/applications/[appId]/settings:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}