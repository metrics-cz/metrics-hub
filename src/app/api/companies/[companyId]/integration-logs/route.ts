/**
 * Integration Logs API
 *
 * Universal API for accessing integration logs from executor server
 * with comprehensive filtering and real-time capabilities.
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';
import { authenticateRequest, checkCompanyPermission } from '@/lib/auth';

interface IntegrationLog {
  id: string;
  log_level: string;
  log_source: string;
  log_category?: string;
  message: string;
  structured_data?: Record<string, any>;
  integration_name: string;
  integration_version?: string;
  container_id?: string;
  logged_at: string;
  log_sequence?: number;
  execution_time_ms?: number;
  memory_usage_mb?: number;
  metadata?: Record<string, any>;
  execution_run_id?: string;
}

interface LogsQuery {
  integration?: string;
  level?: 'debug' | 'info' | 'warn' | 'error' | 'fatal';
  source?: 'integration' | 'docker' | 'executor' | 'api' | 'system';
  category?: string;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
  offset?: number;
  executionRunId?: string;
  containerId?: string;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ companyId: string }> }
) {
  try {
    const { companyId } = await params;
    const { searchParams } = new URL(request.url);

    // Validate authentication
    const authResult = await authenticateRequest(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Parse query parameters
    const query: LogsQuery = {
      integration: searchParams.get('integration') || undefined,
      level: (searchParams.get('level') as LogsQuery['level']) || undefined,
      source: (searchParams.get('source') as LogsQuery['source']) || undefined,
      category: searchParams.get('category') || undefined,
      search: searchParams.get('search') || undefined,
      dateFrom: searchParams.get('dateFrom') || undefined,
      dateTo: searchParams.get('dateTo') || undefined,
      limit: parseInt(searchParams.get('limit') || '100'),
      offset: parseInt(searchParams.get('offset') || '0'),
      executionRunId: searchParams.get('executionRunId') || undefined,
      containerId: searchParams.get('containerId') || undefined,
    };

    // Check company permission
    const permissionCheck = await checkCompanyPermission(authResult.user.id, companyId);
    if (!permissionCheck.hasPermission) {
      return NextResponse.json(
        { success: false, error: permissionCheck.error || 'Company access denied' },
        { status: 403 }
      );
    }

    // Build the query using the database function
    const { data: logs, error } = await supabase.rpc('get_integration_logs', {
      p_company_id: companyId,
      p_integration_name: query.integration || null,
      p_log_level: query.level || null,
      p_date_from: query.dateFrom ? new Date(query.dateFrom).toISOString() : null,
      p_date_to: query.dateTo ? new Date(query.dateTo).toISOString() : null,
      p_search_text: query.search || null,
      p_limit: query.limit || 100,
      p_offset: query.offset || 0
    });

    if (error) {
      console.error('Error fetching integration logs:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch logs' },
        { status: 500 }
      );
    }

    // Apply additional client-side filters that aren't in the database function
    let filteredLogs: IntegrationLog[] = (logs as IntegrationLog[]) || [];

    if (query.source) {
      filteredLogs = filteredLogs.filter(log => log.log_source === query.source);
    }

    if (query.category) {
      filteredLogs = filteredLogs.filter(log => log.log_category === query.category);
    }

    if (query.executionRunId) {
      filteredLogs = filteredLogs.filter(log => log.execution_run_id === query.executionRunId);
    }

    if (query.containerId) {
      filteredLogs = filteredLogs.filter(
        log => log.structured_data?.containerId === query.containerId ||
               log.metadata?.containerId === query.containerId
      );
    }

    // Get total count for pagination
    const { count: totalCount } = await supabase
      .from('integration_logs')
      .select('*', { count: 'exact', head: true })
      .eq('company_id', companyId);

    return NextResponse.json({
      success: true,
      data: {
        logs: filteredLogs,
        pagination: {
          limit: query.limit || 100,
          offset: query.offset || 0,
          total: totalCount || 0,
          hasMore: (query.offset || 0) + (query.limit || 100) < (totalCount || 0)
        },
        filters: query
      }
    });

  } catch (error) {
    console.error('Integration logs API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * Get logs statistics for dashboard
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ companyId: string }> }
) {
  try {
    const { companyId } = await params;
    const body = await request.json();
    const { integrationName, timeRange } = body;

    // Validate authentication
    const authResult = await authenticateRequest(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Check company permission
    const permissionCheck = await checkCompanyPermission(authResult.user.id, companyId);
    if (!permissionCheck.hasPermission) {
      return NextResponse.json(
        { success: false, error: permissionCheck.error || 'Company access denied' },
        { status: 403 }
      );
    }

    // Calculate date range
    let dateFrom: Date | undefined;
    let dateTo: Date = new Date();

    switch (timeRange) {
      case 'hour':
        dateFrom = new Date(Date.now() - 60 * 60 * 1000);
        break;
      case 'day':
        dateFrom = new Date(Date.now() - 24 * 60 * 60 * 1000);
        break;
      case 'week':
        dateFrom = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        dateFrom = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        dateFrom = new Date(Date.now() - 24 * 60 * 60 * 1000); // Default to last 24 hours
    }

    // Build base query
    let query = supabase
      .from('integration_logs')
      .select('log_level, log_source, log_category, logged_at, integration_name, structured_data')
      .eq('company_id', companyId)
      .gte('logged_at', dateFrom.toISOString())
      .lte('logged_at', dateTo.toISOString())
      .order('logged_at', { ascending: false });

    if (integrationName) {
      query = query.eq('integration_name', integrationName);
    }

    const { data: logs, error } = await query;
    const typedStatLogs = logs as IntegrationLog[] | null;

    if (error) {
      console.error('Error fetching logs statistics:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch statistics' },
        { status: 500 }
      );
    }

    // Calculate statistics
    const stats = {
      totalLogs: typedStatLogs?.length || 0,
      errorCount: typedStatLogs?.filter(log => ['error', 'fatal'].includes(log.log_level)).length || 0,
      warningCount: typedStatLogs?.filter(log => log.log_level === 'warn').length || 0,
      infoCount: typedStatLogs?.filter(log => log.log_level === 'info').length || 0,
      debugCount: typedStatLogs?.filter(log => log.log_level === 'debug').length || 0,

      // Sources breakdown
      sourceBreakdown: typedStatLogs?.reduce((acc: Record<string, number>, log) => {
        acc[log.log_source] = (acc[log.log_source] || 0) + 1;
        return acc;
      }, {}) || {},

      // Categories breakdown
      categoryBreakdown: typedStatLogs?.reduce((acc: Record<string, number>, log) => {
        const category = log.log_category || 'uncategorized';
        acc[category] = (acc[category] || 0) + 1;
        return acc;
      }, {}) || {},

      // Integrations breakdown
      integrationBreakdown: typedStatLogs?.reduce((acc: Record<string, number>, log) => {
        acc[log.integration_name] = (acc[log.integration_name] || 0) + 1;
        return acc;
      }, {}) || {},

      // Timeline data (hourly breakdown)
      timeline: typedStatLogs?.reduce((acc: Record<string, number>, log) => {
        const hour = new Date(log.logged_at).toISOString().substring(0, 13) + ':00:00.000Z';
        acc[hour] = (acc[hour] || 0) + 1;
        return acc;
      }, {}) || {},

      // Last updated
      lastLogAt: typedStatLogs && typedStatLogs.length > 0 ? typedStatLogs[0]!.logged_at : null,

      // Time range
      timeRange: {
        from: dateFrom.toISOString(),
        to: dateTo.toISOString()
      }
    };

    return NextResponse.json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('Integration logs statistics API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}