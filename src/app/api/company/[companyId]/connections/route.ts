import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient, createSupabaseServiceClient } from '@/lib/supabaseServer';
import { auditLogger } from '@/lib/audit-logger';

// Get company's connected services
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

    const { data: companyConnections, error } = await supabase
      .from('company_connections')
      .select(`
        *,
        connection:connections(
          id,
          connection_key,
          name,
          description,
          icon_url,
          provider,
          auth_type,
          supported_features,
          documentation_url
        )
      `)
      .eq('company_id', companyId)
      .order('connected_at', { ascending: false });

    if (error) {
      console.error('Error fetching company connections:', {
        error,
        message: error?.message,
        code: error?.code,
        details: error?.details,
        hint: error?.hint,
        companyId
      });
      
      const detailsString = String(error?.message || error?.code || error || 'Unknown database error');
      
      return NextResponse.json(
        { 
          error: 'Failed to fetch company connections', 
          details: detailsString,
          errorCode: String(error?.code || 'unknown'),
          hint: String(error?.hint || 'No additional hints available')
        }, 
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: companyConnections || []
    });

  } catch (error) {
    console.error('Company connections API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    );
  }
}

// Connect a new service for a company
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ companyId: string }> }
) {
  try {
    const { companyId } = await params;
    const body = await request.json();
    const { connectionId, config = {} } = body;

    if (!connectionId) {
      return NextResponse.json(
        { error: 'Connection ID is required' }, 
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

    // Check if connection exists and is active
    const { data: connection, error: connectionError } = await supabase
      .from('connections')
      .select('id, connection_key, name, is_active')
      .eq('id', connectionId)
      .eq('is_active', true)
      .single();

    if (connectionError || !connection) {
      return NextResponse.json(
        { error: 'Connection not found or inactive' }, 
        { status: 404 }
      );
    }

    // Check if already connected
    const { data: existing, error: existingError } = await supabase
      .from('company_connections')
      .select('id')
      .eq('company_id', companyId)
      .eq('connection_id', connectionId)
      .single();

    if (existing) {
      return NextResponse.json(
        { error: 'Connection already established' }, 
        { status: 409 }
      );
    }

    // If there was an error other than "no rows returned", handle it
    if (existingError && existingError.code !== 'PGRST116') {
      console.error('Error checking existing connection:', existingError);
      return NextResponse.json(
        { error: 'Failed to check connection status' }, 
        { status: 500 }
      );
    }

    // Create the connection
    const { data: companyConnection, error: installError } = await supabase
      .from('company_connections')
      .insert({
        company_id: companyId,
        connection_id: connectionId,
        connected_by: user.id,
        config,
        status: 'pending'
      })
      .select(`
        *,
        connection:connections(*)
      `)
      .single();

    if (installError) {
      console.error('Error creating connection:', installError);
      return NextResponse.json(
        { error: 'Failed to create connection', details: installError.message }, 
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `${connection.name} connection created successfully`,
      data: companyConnection
    });

  } catch (error) {
    console.error('Connect service API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    );
  }
}

// Disconnect a service for a company
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ companyId: string }> }
) {
  try {
    const { companyId } = await params;
    const { searchParams } = new URL(request.url);
    const connectionId = searchParams.get('connectionId');

    if (!connectionId) {
      return NextResponse.json(
        { error: 'Connection ID is required' }, 
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
    
    console.log('[CONNECTIONS-DELETE] User attempting delete:', { 
      userId: user.id, 
      companyId, 
      connectionId 
    });

    // Check user's role and permissions
    const { data: userRole, error: roleError } = await supabase
      .from('company_users')
      .select('role')
      .eq('user_id', user.id)
      .eq('company_id', companyId)
      .single();
      
    console.log('[CONNECTIONS-DELETE] User role check:', { 
      role: userRole?.role, 
      error: roleError?.message || 'none' 
    });

    // Check if user has permission to delete connections (admin or owner)
    if (!userRole || !['admin', 'owner'].includes(userRole.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions. Admin or owner role required.' }, 
        { status: 403 }
      );
    }

    // Use service role for the delete operation (bypasses RLS issues)
    const serviceSupabase = createSupabaseServiceClient();

    // Get the connection before deleting for audit log
    const { data: companyConnection, error: fetchError } = await serviceSupabase
      .from('company_connections')
      .select(`
        *,
        connection:connections(name)
      `)
      .eq('company_id', companyId)
      .eq('connection_id', connectionId)
      .single();

    console.log('[CONNECTIONS-DELETE] Connection lookup result:', {
      found: !!companyConnection,
      error: fetchError?.message || 'none'
    });

    if (fetchError || !companyConnection) {
      return NextResponse.json(
        { error: 'Connection not found' }, 
        { status: 404 }
      );
    }

    // Delete the connection using service role
    console.log('[CONNECTIONS-DELETE] Deleting connection with service role');
    const { error: deleteError } = await serviceSupabase
      .from('company_connections')
      .delete()
      .eq('company_id', companyId)
      .eq('connection_id', connectionId);
      
    console.log('[CONNECTIONS-DELETE] Delete operation result:', {
      success: !deleteError,
      error: deleteError?.message || 'none',
      errorCode: deleteError?.code || 'none'
    });

    if (deleteError) {
      console.error('[CONNECTIONS-DELETE] Service role delete failed:', deleteError);
      return NextResponse.json(
        { error: 'Failed to disconnect service', details: deleteError.message }, 
        { status: 500 }
      );
    }

    // Log the disconnection
    await auditLogger.logAuditEvent({
      table_name: 'company_connections',
      operation: 'DELETE',
      user_id: user.id,
      metadata: {
        action: 'connection_disconnected',
        company_id: companyId,
        connection_name: companyConnection.connection?.name,
        connection_id: connectionId,
      }
    });

    return NextResponse.json({
      success: true,
      message: `${companyConnection.connection?.name || 'Connection'} disconnected successfully`
    });

  } catch (error) {
    console.error('Disconnect service API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    );
  }
}