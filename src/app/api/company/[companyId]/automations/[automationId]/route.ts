import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabaseServer';

interface RouteParams {
  companyId: string;
  automationId: string;
}

// Get specific automation details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<RouteParams> }
) {
  try {
    const { companyId, automationId } = await params;
    const supabase = await createSupabaseServerClient();

    const { data: companyAutomation, error } = await supabase
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
      .eq('id', automationId)
      .single();

    if (error) {
      console.error('Error fetching company automation:', error);
      if (error instanceof Error && error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Automation not found' }, 
          { status: 404 }
        );
      }
      return NextResponse.json(
        { error: 'Failed to fetch automation' }, 
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: companyAutomation
    });

  } catch (error) {
    console.error('Company automation detail API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    );
  }
}

// Update automation configuration/settings
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<RouteParams> }
) {
  try {
    const { companyId, automationId } = await params;
    const body = await request.json();
    const { 
      isActive, 
      frequency, 
      metricsWatched, 
      periodDays, 
      notificationChannels, 
      config 
    } = body;

    const supabase = await createSupabaseServerClient();

    // Get current user
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
        { success: false, error: 'Insufficient permissions to update automation settings' },
        { status: 403 }
      );
    }

    // Get current automation to calculate new price
    const { data: currentAutomation, error: currentError } = await supabase
      .from('company_automations')
      .select(`
        *,
        automation:automations(*)
      `)
      .eq('company_id', companyId)
      .eq('id', automationId)
      .single();

    if (currentError || !currentAutomation) {
      return NextResponse.json(
        { success: false, error: 'Automation not found' },
        { status: 404 }
      );
    }

    // Calculate new price if frequency changed
    let newPrice = currentAutomation.price_per_month;
    if (frequency && frequency !== currentAutomation.frequency) {
      const pricingConfig = (currentAutomation.automation as any)?.pricing_config || {};
      newPrice = pricingConfig[frequency] || currentAutomation.price_per_month;
    }

    // Build update data
    const updateData: any = {
      updated_at: new Date().toISOString()
    };
    if (isActive !== undefined) updateData.is_active = isActive;
    if (frequency !== undefined) {
      updateData.frequency = frequency;
      updateData.price_per_month = newPrice;
    }
    if (metricsWatched !== undefined) updateData.metrics_watched = metricsWatched;
    if (periodDays !== undefined) updateData.period_days = periodDays;
    if (notificationChannels !== undefined) updateData.notification_channels = notificationChannels;
    if (config !== undefined) updateData.config = config;

    // Update the automation
    const { data: updatedAutomation, error: updateError } = await supabase
      .from('company_automations')
      .update(updateData)
      .eq('company_id', companyId)
      .eq('id', automationId)
      .select(`
        *,
        automation:automations(*),
        integration:company_integrations(
          *,
          integration:integrations(*)
        )
      `)
      .single();

    if (updateError) {
      console.error('Error updating automation:', updateError);
      return NextResponse.json(
        { success: false, error: 'Failed to update automation settings' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Automation settings updated successfully',
      data: updatedAutomation
    });

  } catch (error) {
    console.error('Error in PUT /api/company/[companyId]/automations/[automationId]:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Delete/uninstall automation
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<RouteParams> }
) {
  try {
    const { companyId, automationId } = await params;
    const supabase = await createSupabaseServerClient();

    // Get automation name before deletion
    const { data: automationInfo } = await supabase
      .from('company_automations')
      .select(`
        automation:automations!inner(name)
      `)
      .eq('company_id', companyId)
      .eq('id', automationId)
      .single();

    const { error } = await supabase
      .from('company_automations')
      .delete()
      .eq('company_id', companyId)
      .eq('id', automationId);

    if (error) {
      console.error('Error uninstalling automation:', error);
      return NextResponse.json(
        { error: 'Failed to uninstall automation' }, 
        { status: 500 }
      );
    }

    const automationName = (automationInfo?.automation as any)?.name || 'Automation';

    return NextResponse.json({
      success: true,
      message: `${automationName} uninstalled successfully`
    });

  } catch (error) {
    console.error('Uninstall automation API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    );
  }
}