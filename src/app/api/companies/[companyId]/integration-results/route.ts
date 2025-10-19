/**
 * Integration Results API
 *
 * Provides aggregated success metrics and results from integration executions
 * for dashboard display and monitoring.
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';
import { authenticateRequest, checkCompanyPermission } from '@/lib/auth';

interface IntegrationResult {
  id: string;
  integration_name: string;
  last_run_at: string;
  success_count: number;
  total_runs: number;
  last_success_metrics?: Record<string, any>;
  last_error_message?: string;
  health_status: 'healthy' | 'warning' | 'error' | 'unknown';
}

interface IntegrationResultsResponse {
  success: boolean;
  data?: {
    integrations: IntegrationResult[];
    summary: {
      total_integrations: number;
      healthy_count: number;
      warning_count: number;
      error_count: number;
      last_updated: string;
    };
  };
  error?: string;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ companyId: string }> }
): Promise<NextResponse<IntegrationResultsResponse>> {
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

    // Check company permission
    const permissionCheck = await checkCompanyPermission(authResult.user.id, companyId);
    if (!permissionCheck.hasPermission) {
      return NextResponse.json(
        { success: false, error: permissionCheck.error || 'Company access denied' },
        { status: 403 }
      );
    }

    // Get time range for analysis (default: last 7 days)
    const daysBack = parseInt(searchParams.get('daysBack') || '7');
    const timeRange = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000).toISOString();

    // Query integration logs to build results summary
    const { data: recentLogs, error: logsError } = await supabase
      .from('integration_logs')
      .select(`
        integration_name,
        log_level,
        logged_at,
        structured_data,
        log_category,
        message
      `)
      .eq('company_id', companyId)
      .gte('logged_at', timeRange)
      .order('logged_at', { ascending: false });

    if (logsError) {
      console.error('Error fetching integration logs:', logsError);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch integration results' },
        { status: 500 }
      );
    }

    // Process logs to create integration results
    const integrationResults = processLogsToResults(recentLogs || []);

    // Calculate summary statistics
    const summary = {
      total_integrations: integrationResults.length,
      healthy_count: integrationResults.filter(r => r.health_status === 'healthy').length,
      warning_count: integrationResults.filter(r => r.health_status === 'warning').length,
      error_count: integrationResults.filter(r => r.health_status === 'error').length,
      last_updated: new Date().toISOString()
    };

    return NextResponse.json({
      success: true,
      data: {
        integrations: integrationResults,
        summary
      }
    });

  } catch (error) {
    console.error('Integration results API error:', error);
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
 * Process raw integration logs into structured results
 */
function processLogsToResults(logs: any[]): IntegrationResult[] {
  const integrationMap = new Map<string, {
    logs: any[];
    lastRunAt: string;
    successCount: number;
    totalRuns: number;
    lastSuccessMetrics?: Record<string, any>;
    lastErrorMessage?: string;
  }>();

  // Group logs by integration
  logs.forEach(log => {
    const integrationName = log.integration_name;
    if (!integrationMap.has(integrationName)) {
      integrationMap.set(integrationName, {
        logs: [],
        lastRunAt: log.logged_at,
        successCount: 0,
        totalRuns: 0,
        lastSuccessMetrics: undefined,
        lastErrorMessage: undefined
      });
    }

    const integration = integrationMap.get(integrationName)!;
    integration.logs.push(log);

    // Update last run time
    if (new Date(log.logged_at) > new Date(integration.lastRunAt)) {
      integration.lastRunAt = log.logged_at;
    }

    // Extract success metrics from integration_results category
    if (log.log_category === 'integration_results' && log.log_level === 'info') {
      integration.successCount++;
      if (log.structured_data?.successMetrics) {
        integration.lastSuccessMetrics = log.structured_data.successMetrics;
      }
    }

    // Count total execution attempts
    if (log.log_category === 'integration_startup') {
      integration.totalRuns++;
    }

    // Capture last error message
    if (log.log_level === 'error' || log.log_level === 'fatal') {
      integration.lastErrorMessage = log.message;
    }
  });

  // Convert to results array
  return Array.from(integrationMap.entries()).map(([integrationName, data]) => {
    // Determine health status
    let healthStatus: 'healthy' | 'warning' | 'error' | 'unknown' = 'unknown';

    if (data.totalRuns > 0) {
      const successRate = data.successCount / data.totalRuns;
      const hasRecentErrors = data.logs.some(log =>
        (log.log_level === 'error' || log.log_level === 'fatal') &&
        new Date(log.logged_at) > new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
      );

      if (successRate >= 0.9 && !hasRecentErrors) {
        healthStatus = 'healthy';
      } else if (successRate >= 0.7 || hasRecentErrors) {
        healthStatus = 'warning';
      } else {
        healthStatus = 'error';
      }
    }

    return {
      id: integrationName,
      integration_name: integrationName,
      last_run_at: data.lastRunAt,
      success_count: data.successCount,
      total_runs: data.totalRuns,
      last_success_metrics: data.lastSuccessMetrics,
      last_error_message: data.lastErrorMessage,
      health_status: healthStatus
    };
  }).sort((a, b) => new Date(b.last_run_at).getTime() - new Date(a.last_run_at).getTime());
}