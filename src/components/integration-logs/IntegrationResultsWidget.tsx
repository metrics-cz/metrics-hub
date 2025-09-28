'use client';

import React, { useState, useEffect } from 'react';
import { CheckCircle, AlertTriangle, XCircle, Clock, TrendingUp, Users, Target, RefreshCw } from 'lucide-react';

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

interface IntegrationResultsWidgetProps {
  companyId: string;
  integrationName?: string;
  showSummary?: boolean;
  className?: string;
}

export default function IntegrationResultsWidget({
  companyId,
  integrationName,
  showSummary = false,
  className = ''
}: IntegrationResultsWidgetProps) {
  const [results, setResults] = useState<IntegrationResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchResults = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/companies/${companyId}/integration-results`);

      if (!response.ok) {
        throw new Error('Failed to fetch integration results');
      }

      const data = await response.json();
      if (data.success) {
        let integrationResults = data.data.integrations;

        // Filter by specific integration if provided
        if (integrationName) {
          integrationResults = integrationResults.filter(
            (result: IntegrationResult) => result.integration_name === integrationName
          );
        }

        setResults(integrationResults);
      } else {
        throw new Error(data.error || 'Unknown error');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResults();
  }, [companyId, integrationName]);

  const getHealthIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-yellow-600" />;
      case 'error':
        return <XCircle className="w-4 h-4 text-red-600" />;
      default:
        return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  const formatLastRun = (timestamp: string) => {
    const now = new Date();
    const runTime = new Date(timestamp);
    const diffMs = now.getTime() - runTime.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor(diffMs / (1000 * 60));

    if (diffMinutes < 60) {
      return `${diffMinutes}m ago`;
    } else if (diffHours < 24) {
      return `${diffHours}h ago`;
    } else {
      const diffDays = Math.floor(diffHours / 24);
      return `${diffDays}d ago`;
    }
  };

  const renderIntegrationMetrics = (result: IntegrationResult) => {
    if (!result.last_success_metrics) return null;

    const metrics = result.last_success_metrics;

    // Google Ads Anomaly Watchdog specific metrics
    if (result.integration_name === 'google-ads-anomaly-watchdog') {
      return (
        <div className="flex items-center gap-3 text-xs text-gray-600 mt-1">
          {metrics.accountsProcessed && (
            <div className="flex items-center gap-1">
              <Users className="w-3 h-3" />
              <span>{metrics.accountsProcessed} accounts</span>
            </div>
          )}
          {metrics.alertsFound !== undefined && (
            <div className="flex items-center gap-1">
              <Target className="w-3 h-3" />
              <span>{metrics.alertsFound} alerts</span>
            </div>
          )}
          {metrics.healthScore && (
            <div className="flex items-center gap-1">
              <TrendingUp className="w-3 h-3" />
              <span>{metrics.healthScore}/100</span>
            </div>
          )}
        </div>
      );
    }

    // Generic metrics display
    return (
      <div className="flex items-center gap-3 text-xs text-gray-600 mt-1">
        {metrics.hasData && <span>✓ Data processed</span>}
        {metrics.alertsCount !== undefined && <span>{metrics.alertsCount} alerts</span>}
      </div>
    );
  };

  if (loading) {
    return (
      <div className={`flex items-center justify-center p-4 ${className}`}>
        <RefreshCw className="w-4 h-4 animate-spin text-gray-400" />
        <span className="ml-2 text-sm text-gray-500">Loading results...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`p-4 bg-red-50 border border-red-200 rounded-lg ${className}`}>
        <div className="flex items-center gap-2">
          <XCircle className="w-4 h-4 text-red-600" />
          <span className="text-sm text-red-800">Error loading results: {error}</span>
        </div>
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div className={`p-4 bg-gray-50 border border-gray-200 rounded-lg ${className}`}>
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-gray-400" />
          <span className="text-sm text-gray-600">
            {integrationName ? `No results for ${integrationName}` : 'No integration results'}
          </span>
        </div>
      </div>
    );
  }

  if (showSummary && results.length > 1) {
    const healthyCount = results.filter(r => r.health_status === 'healthy').length;
    const warningCount = results.filter(r => r.health_status === 'warning').length;
    const errorCount = results.filter(r => r.health_status === 'error').length;

    return (
      <div className={`p-4 border rounded-lg ${className}`}>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium text-gray-900">Integration Health</h3>
            <p className="text-xs text-gray-500">{results.length} integrations</p>
          </div>
          <div className="flex items-center gap-2">
            {healthyCount > 0 && (
              <div className="flex items-center gap-1">
                <CheckCircle className="w-3 h-3 text-green-600" />
                <span className="text-xs text-green-700">{healthyCount}</span>
              </div>
            )}
            {warningCount > 0 && (
              <div className="flex items-center gap-1">
                <AlertTriangle className="w-3 h-3 text-yellow-600" />
                <span className="text-xs text-yellow-700">{warningCount}</span>
              </div>
            )}
            {errorCount > 0 && (
              <div className="flex items-center gap-1">
                <XCircle className="w-3 h-3 text-red-600" />
                <span className="text-xs text-red-700">{errorCount}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-2 ${className}`}>
      {results.map((result) => (
        <div
          key={result.id}
          className={`p-3 border rounded-lg ${
            result.health_status === 'healthy'
              ? 'border-green-200 bg-green-50'
              : result.health_status === 'warning'
              ? 'border-yellow-200 bg-yellow-50'
              : result.health_status === 'error'
              ? 'border-red-200 bg-red-50'
              : 'border-gray-200 bg-gray-50'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {getHealthIcon(result.health_status)}
              <div>
                <div className="text-sm font-medium text-gray-900">
                  {result.integration_name.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </div>
                <div className="text-xs text-gray-500">
                  Last run: {formatLastRun(result.last_run_at)}
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs text-gray-600">
                {result.success_count}/{result.total_runs} successful
              </div>
              {result.total_runs > 0 && (
                <div className="text-xs text-gray-500">
                  {Math.round((result.success_count / result.total_runs) * 100)}% success rate
                </div>
              )}
            </div>
          </div>

          {renderIntegrationMetrics(result)}

          {result.last_error_message && result.health_status !== 'healthy' && (
            <div className="mt-2 text-xs text-red-700 bg-red-100 p-2 rounded">
              {result.last_error_message}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}