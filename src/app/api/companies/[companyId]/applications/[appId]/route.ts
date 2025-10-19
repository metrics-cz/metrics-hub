import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabaseServer';

// Get specific installed application details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ companyId: string; appId: string }> }
) {
  try {
    const { companyId, appId } = await params;
    const supabase = await createSupabaseServerClient();

    const { data: companyApplication, error } = await supabase
      .from('company_applications')
      .select(`
        *,
        application:applications(
          *,
          permissions:application_permissions(*)
        )
      `)
      .eq('company_id', companyId)
      .eq('application_id', appId)
      .single();

    if (error) {
      console.error('Error fetching company application:', error);
      if (error instanceof Error && error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Application not installed' }, 
          { status: 404 }
        );
      }
      return NextResponse.json(
        { error: 'Failed to fetch application' }, 
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: companyApplication
    });

  } catch (error) {
    console.error('Company application detail API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    );
  }
}

// Update application configuration/settings
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ companyId: string; appId: string }> }
) {
  try {
    const { companyId, appId } = await params;
    const body = await request.json();
    const { configuration, settings, is_active } = body;

    const supabase = await createSupabaseServerClient();

    const updateData: any = {};
    if (configuration !== undefined) updateData.configuration = configuration;
    if (settings !== undefined) updateData.settings = settings;
    if (is_active !== undefined) updateData.is_active = is_active;

    const { data: updatedApplication, error } = await supabase
      .from('company_applications')
      .update(updateData)
      .eq('company_id', companyId)
      .eq('application_id', appId)
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
          is_premium,
          price,
          features,
          tags
        )
      `)
      .single();

    if (error) {
      console.error('Error updating application:', error);
      return NextResponse.json(
        { error: 'Failed to update application' }, 
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Application updated successfully',
      data: updatedApplication
    });

  } catch (error) {
    console.error('Update application API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    );
  }
}

// Uninstall application
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ companyId: string; appId: string }> }
) {
  try {
    const { companyId, appId } = await params;

    const supabase = await createSupabaseServerClient();

    // Get application name before deletion
    const { data: appInfo } = await supabase
      .from('company_applications')
      .select(`
        application:applications!inner(name)
      `)
      .eq('company_id', companyId)
      .eq('application_id', appId)
      .single();

    const { error } = await supabase
      .from('company_applications')
      .delete()
      .eq('company_id', companyId)
      .eq('application_id', appId);

    if (error) {
      console.error('Error uninstalling application:', error);
      return NextResponse.json(
        { error: 'Failed to uninstall application' }, 
        { status: 500 }
      );
    }

    const appName = (appInfo?.application as any)?.name || 'Application';

    return NextResponse.json({
      success: true,
      message: `${appName} uninstalled successfully`
    });

  } catch (error) {
    console.error('Uninstall application API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    );
  }
}