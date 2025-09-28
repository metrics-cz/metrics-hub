/**
 * Dashboard Statistics API
 *
 * Provides real-time dashboard statistics aggregated from integration logs,
 * company applications, and execution history for comprehensive monitoring.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAuthenticatedClient } from '@/lib/auth';

interface DashboardStats {
  activeIntegrations: number;
  totalJobsLast24h: number;
  errorJobsLast24h: number;
  successJobsLast24h: number;
  lastUpdated: string;
}

interface ActivityItem {
  id: string;
  type: 'success' | 'error' | 'info';
  integration: string;
  automation: string;
  timestamp: string;
  result: string;
  metadata?: Record<string, any>;
}

interface DashboardResponse {
  success: boolean;
  data?: {
    stats: DashboardStats;
    activities: ActivityItem[];
  };
  error?: string;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ companyId: string }> }
): Promise<NextResponse<DashboardResponse>> {
  try {
    const { companyId } = await params;

    // Create authenticated client with automatic auth and permission checking
    const { supabase, user } = await createAuthenticatedClient(request);

    // Verify user has permission for this company
    const { data: companyUser, error: permissionError } = await supabase
      .from('company_users')
      .select('role')
      .eq('user_id', user.id)
      .eq('company_id', companyId)
      .single();

    if (permissionError || !companyUser) {
      return NextResponse.json(
        { success: false, error: 'Company access denied' },
        { status: 403 }
      );
    }

    // Get active integrations count
    const { data: companyApps, error: appsError } = await supabase
      .from('company_applications')
      .select('id, application:applications!inner(name)')
      .eq('company_id', companyId)
      .eq('is_active', true);

    if (appsError) {
      console.error('Error fetching company applications:', appsError);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch integration data' },
        { status: 500 }
      );
    }

    const activeIntegrations = companyApps?.length || 0;

    // Calculate time range for 24h statistics
    const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    // Get integration logs for last 24 hours
    const { data: recentLogs, error: logsError } = await supabase
      .from('integration_logs')
      .select(`
        id,
        integration_name,
        log_level,
        log_category,
        message,
        structured_data,
        logged_at,
        company_application_id
      `)
      .eq('company_id', companyId)
      .gte('logged_at', last24Hours)
      .order('logged_at', { ascending: false })
      .limit(200);

    if (logsError) {
      console.error('Error fetching integration logs:', logsError);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch logs data' },
        { status: 500 }
      );
    }

    // Calculate job statistics
    const jobStartupLogs = recentLogs?.filter(log => log.log_category === 'integration_startup') || [];
    const totalJobsLast24h = jobStartupLogs.length;

    const errorLogs = recentLogs?.filter(log =>
      log.log_level === 'error' || log.log_level === 'fatal'
    ) || [];
    const errorJobsLast24h = errorLogs.length;

    const successLogs = recentLogs?.filter(log =>
      log.log_category === 'integration_results' && log.log_level === 'info'
    ) || [];
    const successJobsLast24h = successLogs.length;

    // Build stats object
    const stats: DashboardStats = {
      activeIntegrations,
      totalJobsLast24h,
      errorJobsLast24h,
      successJobsLast24h,
      lastUpdated: new Date().toISOString()
    };

    // Transform recent logs into activity items
    const activities = transformLogsToActivities(recentLogs || []);

    return NextResponse.json({
      success: true,
      data: {
        stats,
        activities: activities.slice(0, 10) // Show last 10 activities
      }
    });

  } catch (error) {
    console.error('Dashboard stats API error:', error);

    // Handle authentication errors specifically
    if (error instanceof Error && error.message.includes('Authentication failed')) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

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
 * Transform integration logs into dashboard activity items
 */
function transformLogsToActivities(logs: any[]): ActivityItem[] {
  const activities: ActivityItem[] = [];
  const processedExecutions = new Set<string>();

  // Group logs by integration execution to avoid duplicates
  const executionGroups = new Map<string, any[]>();

  logs.forEach(log => {
    const executionKey = `${log.integration_name}-${log.logged_at.substring(0, 16)}`; // Group by minute
    if (!executionGroups.has(executionKey)) {
      executionGroups.set(executionKey, []);
    }
    executionGroups.get(executionKey)!.push(log);
  });

  // Process each execution group
  Array.from(executionGroups.entries())
    .sort((a, b) => new Date(b[1][0].logged_at).getTime() - new Date(a[1][0].logged_at).getTime())
    .forEach(([executionKey, groupLogs]) => {
      if (processedExecutions.has(executionKey)) return;
      processedExecutions.add(executionKey);

      // Find the most relevant log for this execution
      const resultLog = groupLogs.find(log => log.log_category === 'integration_results');
      const errorLog = groupLogs.find(log => log.log_level === 'error' || log.log_level === 'fatal');
      const alertLog = groupLogs.find(log => log.log_category === 'integration_alert');
      const primaryLog = resultLog || errorLog || alertLog || groupLogs[0];

      if (!primaryLog) return;

      // Determine activity type
      let type: 'success' | 'error' | 'info' = 'info';
      if (resultLog && resultLog.log_level === 'info') {
        type = 'success';
      } else if (errorLog || primaryLog.log_level === 'error' || primaryLog.log_level === 'fatal') {
        type = 'error';
      }

      // Format integration name
      const integrationDisplayName = formatIntegrationName(primaryLog.integration_name);

      // Generate automation description and result
      const { automation, result } = formatActivityResult(primaryLog, groupLogs);

      activities.push({
        id: primaryLog.id,
        type,
        integration: integrationDisplayName,
        automation,
        timestamp: primaryLog.logged_at,
        result,
        metadata: primaryLog.structured_data
      });
    });

  return activities;
}

/**
 * Format integration name for display
 */
function formatIntegrationName(name: string): string {
  const nameMap: Record<string, string> = {
    'google-ads-anomaly-watchdog': 'Google Ads',
    'google-ads-central-overview': 'Google Ads',
    'google-sheets-export': 'Google Sheets',
    'slack-notifications': 'Slack',
    'gmail-campaign': 'Gmail',
    'trello-sync': 'Trello'
  };

  return nameMap[name] || name
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Format activity automation and result text
 */
function formatActivityResult(primaryLog: any, groupLogs: any[]): { automation: string; result: string } {
  const structuredData = primaryLog.structured_data || {};
  const integrationName = primaryLog.integration_name;

  // Google Ads Anomaly Watchdog specific formatting
  if (integrationName === 'google-ads-anomaly-watchdog') {
    if (primaryLog.log_category === 'integration_results') {
      const metrics = structuredData.successMetrics || {};
      const accountsProcessed = metrics.accountsProcessed || 0;
      const alertsFound = metrics.alertsFound || 0;

      return {
        automation: 'Anomaly Detection',
        result: alertsFound > 0
          ? `Zpracováno ${accountsProcessed} účtů, nalezeno ${alertsFound} upozornění`
          : `Zpracováno ${accountsProcessed} účtů, žádná anomálie`
      };
    } else if (primaryLog.log_category === 'integration_alert') {
      return {
        automation: 'Performance Alert',
        result: primaryLog.message
      };
    }
  }

  // Generic integration formatting
  if (primaryLog.log_category === 'integration_results') {
    return {
      automation: 'Automated Execution',
      result: structuredData.successMetrics ? 'Úspěšně dokončeno' : primaryLog.message
    };
  } else if (primaryLog.log_level === 'error' || primaryLog.log_level === 'fatal') {
    return {
      automation: 'Integration Error',
      result: `Chyba: ${primaryLog.message}`
    };
  } else {
    return {
      automation: 'Integration Activity',
      result: primaryLog.message
    };
  }
}