'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Search, Filter, Download, RefreshCw, Calendar, AlertCircle, Info, AlertTriangle, Bug, Zap, CheckCircle, TrendingUp, Users, Target } from 'lucide-react';

/**
 * Universal Integration Logs Viewer
 *
 * Adapts to different integration log structures and provides
 * comprehensive filtering, search, and real-time updates.
 */

interface LogEntry {
 id: string;
 log_level: 'debug' | 'info' | 'warn' | 'error' | 'fatal';
 log_source: 'integration' | 'docker' | 'executor' | 'api' | 'system';
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
 company_application_id: string;
}

interface LogsViewerProps {
 companyId: string;
 integrationName?: string;
 executionRunId?: string;
 height?: string;
 showFilters?: boolean;
 showExport?: boolean;
 autoRefresh?: boolean;
 refreshInterval?: number;
}

interface LogFilters {
 level?: string;
 source?: string;
 category?: string;
 search?: string;
 dateFrom?: string;
 dateTo?: string;
}

export function LogsViewer({
 companyId,
 integrationName,
 executionRunId,
 height = '600px',
 showFilters = true,
 showExport = true,
 autoRefresh = false,
 refreshInterval = 5000
}: LogsViewerProps) {
 const [logs, setLogs] = useState<LogEntry[]>([]);
 const [loading, setLoading] = useState(true);
 const [error, setError] = useState<string | null>(null);
 const [filters, setFilters] = useState<LogFilters>({});
 const [searchTerm, setSearchTerm] = useState('');
 const [selectedLog, setSelectedLog] = useState<LogEntry | null>(null);
 const [showFiltersPanel, setShowFiltersPanel] = useState(false);

 // Available filter options (populated from logs)
 const filterOptions = useMemo(() => {
  const categories = new Set<string>();
  const sources = new Set<string>();
  const levels = new Set<string>();

  logs.forEach(log => {
   if (log.log_category) categories.add(log.log_category);
   sources.add(log.log_source);
   levels.add(log.log_level);
  });

  return {
   categories: Array.from(categories).sort(),
   sources: Array.from(sources).sort(),
   levels: Array.from(levels).sort()
  };
 }, [logs]);

 // Filtered logs
 const filteredLogs = useMemo(() => {
  return logs.filter(log => {
   // Level filter
   if (filters.level && log.log_level !== filters.level) return false;

   // Source filter
   if (filters.source && log.log_source !== filters.source) return false;

   // Category filter
   if (filters.category && log.log_category !== filters.category) return false;

   // Search filter
   if (searchTerm) {
    const searchLower = searchTerm.toLowerCase();
    if (!log.message.toLowerCase().includes(searchLower) &&
      !JSON.stringify(log.structured_data || {}).toLowerCase().includes(searchLower)) {
     return false;
    }
   }

   // Date filters
   if (filters.dateFrom && new Date(log.logged_at) < new Date(filters.dateFrom)) return false;
   if (filters.dateTo && new Date(log.logged_at) > new Date(filters.dateTo)) return false;

   return true;
  });
 }, [logs, filters, searchTerm]);

 // Fetch logs
 const fetchLogs = async () => {
  try {
   setLoading(true);
   setError(null);

   const params = new URLSearchParams();
   if (integrationName) params.append('integration', integrationName);
   if (executionRunId) params.append('executionRunId', executionRunId);
   if (filters.level) params.append('level', filters.level);
   if (filters.source) params.append('source', filters.source);
   if (filters.category) params.append('category', filters.category);
   if (filters.search) params.append('search', filters.search);
   if (filters.dateFrom) params.append('dateFrom', filters.dateFrom);
   if (filters.dateTo) params.append('dateTo', filters.dateTo);
   params.append('limit', '500'); // Increase limit for comprehensive view

   const response = await fetch(`/api/companies/${companyId}/integration-logs?${params}`);

   if (!response.ok) {
    throw new Error(`Failed to fetch logs: ${response.status}`);
   }

   const result = await response.json();

   if (result.success) {
    setLogs(result.data.logs);
   } else {
    setError(result.error || 'Failed to fetch logs');
   }
  } catch (err) {
   setError(err instanceof Error ? err.message : 'Unknown error');
  } finally {
   setLoading(false);
  }
 };

 // Auto-refresh effect
 useEffect(() => {
  fetchLogs();

  if (autoRefresh && refreshInterval > 0) {
   const interval = setInterval(fetchLogs, refreshInterval);
   return () => clearInterval(interval);
  }
  return undefined;
 }, [companyId, integrationName, executionRunId, filters, autoRefresh, refreshInterval]);

 // Export logs
 const exportLogs = () => {
  const csvContent = [
   // Headers
   ['Timestamp', 'Level', 'Source', 'Category', 'Integration', 'Message', 'Execution Time (ms)', 'Memory (MB)'].join(','),
   // Data
   ...filteredLogs.map(log => [
    log.logged_at,
    log.log_level,
    log.log_source,
    log.log_category || '',
    log.integration_name,
    `"${log.message.replace(/"/g, '""')}"`, // Escape quotes for CSV
    log.execution_time_ms || '',
    log.memory_usage_mb || ''
   ].join(','))
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `integration-logs-${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
 };

 // Get log level icon and color
 const getLogLevelStyle = (level: string) => {
  switch (level) {
   case 'debug':
    return { icon: Bug, color: 'text-muted', bg: 'bg-base' };
   case 'info':
    return { icon: Info, color: 'text-blue-500', bg: 'bg-blue-50' };
   case 'warn':
    return { icon: AlertTriangle, color: 'text-yellow-500', bg: 'bg-yellow-50' };
   case 'error':
    return { icon: AlertCircle, color: 'text-red-500', bg: 'bg-red-50' };
   case 'fatal':
    return { icon: Zap, color: 'text-red-700', bg: 'bg-red-100' };
   default:
    return { icon: Info, color: 'text-muted', bg: 'bg-base' };
  }
 };

 // Format timestamp
 const formatTimestamp = (timestamp: string) => {
  return new Date(timestamp).toLocaleString();
 };

 // Render structured data
 const renderStructuredData = (data: Record<string, any>) => {
  if (!data || Object.keys(data).length === 0) return null;

  return (
   <div className="mt-2 p-2 bg-base rounded text-xs">
    <pre className="whitespace-pre-wrap text-secondary">
     {JSON.stringify(data, null, 2)}
    </pre>
   </div>
  );
 };

 // Render success metrics for integration results
 const renderSuccessMetrics = (log: LogEntry) => {
  if (log.log_category !== 'integration_results' || !log.structured_data?.successMetrics) {
   return null;
  }

  const metrics = log.structured_data.successMetrics;

  // Integration-specific success displays
  if (log.integration_name === 'google-ads-anomaly-watchdog') {
   return (
    <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
     <div className="flex items-center gap-2 mb-2">
      <CheckCircle className="w-4 h-4 text-green-600" />
      <span className="text-sm font-medium text-green-800">Watchdog Results</span>
     </div>
     <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {metrics.accountsProcessed && (
       <div className="flex items-center gap-2">
        <Users className="w-3 h-3 text-green-600" />
        <span className="text-xs text-green-700">
         {metrics.accountsProcessed} accounts monitored
        </span>
       </div>
      )}
      {metrics.alertsFound !== undefined && (
       <div className="flex items-center gap-2">
        <Target className="w-3 h-3 text-amber-600" />
        <span className="text-xs text-amber-700">
         {metrics.alertsFound} alerts found
        </span>
       </div>
      )}
      {metrics.healthScore && (
       <div className="flex items-center gap-2">
        <TrendingUp className="w-3 h-3 text-blue-600" />
        <span className="text-xs text-blue-700">
         Health: {metrics.healthScore}/100
        </span>
       </div>
      )}
      {(metrics.criticalAlerts || metrics.highAlerts) && (
       <div className="flex items-center gap-2">
        <AlertTriangle className="w-3 h-3 text-red-600" />
        <span className="text-xs text-red-700">
         {(metrics.criticalAlerts || 0) + (metrics.highAlerts || 0)} priority alerts
        </span>
       </div>
      )}
     </div>
    </div>
   );
  }

  // Generic success metrics display
  return (
   <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
    <div className="flex items-center gap-2 mb-2">
     <CheckCircle className="w-4 h-4 text-blue-600" />
     <span className="text-sm font-medium text-blue-800">Integration Results</span>
    </div>
    <div className="text-xs text-blue-700">
     {metrics.hasData && (
      <div>✓ Data processed successfully</div>
     )}
     {metrics.alertsCount !== undefined && (
      <div>• {metrics.alertsCount} alerts generated</div>
     )}
     {metrics.dataKeys && (
      <div>• {metrics.dataKeys} data elements</div>
     )}
    </div>
   </div>
  );
 };

 if (loading && logs.length === 0) {
  return (
   <div className="flex items-center justify-center p-8">
    <RefreshCw className="w-6 h-6 animate-spin mr-2" />
    <span>Loading logs...</span>
   </div>
  );
 }

 if (error) {
  return (
   <div className="flex items-center justify-center p-8 text-red-600">
    <AlertCircle className="w-6 h-6 mr-2" />
    <span>Error: {error}</span>
    <button
     onClick={fetchLogs}
     className="ml-4 px-3 py-1 bg-red-100 hover:bg-red-200 rounded text-sm"
    >
     Retry
    </button>
   </div>
  );
 }

 return (
  <div className="flex flex-col h-full">
   {/* Header with controls */}
   <div className="flex items-center justify-between p-4 border-b bg-white">
    <div className="flex items-center space-x-4">
     <h3 className="text-lg font-semibold">
      Integration Logs
      {integrationName && <span className="text-sm text-muted ml-2">({integrationName})</span>}
     </h3>
     <span className="text-sm text-muted">
      {filteredLogs.length} of {logs.length} logs
     </span>
    </div>

    <div className="flex items-center space-x-2">
     {showFilters && (
      <button
       onClick={() => setShowFiltersPanel(!showFiltersPanel)}
       className={`p-2 rounded hover:bg-input ${showFiltersPanel ? 'bg-input' : ''}`}
      >
       <Filter className="w-4 h-4" />
      </button>
     )}

     {showExport && (
      <button
       onClick={exportLogs}
       className="p-2 rounded hover:bg-input"
       title="Export logs"
      >
       <Download className="w-4 h-4" />
      </button>
     )}

     <button
      onClick={fetchLogs}
      className="p-2 rounded hover:bg-input"
      title="Refresh logs"
      disabled={loading}
     >
      <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
     </button>
    </div>
   </div>

   {/* Search bar */}
   <div className="p-4 bg-base border-b">
    <div className="relative">
     <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted w-4 h-4" />
     <input
      type="text"
      placeholder="Search logs..."
      value={searchTerm}
      onChange={(e) => setSearchTerm(e.target.value)}
      className="w-full pl-10 pr-4 py-2 border border-border-default rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
     />
    </div>
   </div>

   {/* Filters panel */}
   {showFiltersPanel && (
    <div className="p-4 bg-base border-b">
     <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <div>
       <label className="block text-sm font-medium text-primary mb-1">Level</label>
       <select
        value={filters.level || ''}
        onChange={(e) => setFilters(prev => ({ ...prev, level: e.target.value || undefined }))}
        className="w-full p-2 border border-border-default rounded text-sm"
       >
        <option value="">All levels</option>
        {filterOptions.levels.map(level => (
         <option key={level} value={level}>{level}</option>
        ))}
       </select>
      </div>

      <div>
       <label className="block text-sm font-medium text-primary mb-1">Source</label>
       <select
        value={filters.source || ''}
        onChange={(e) => setFilters(prev => ({ ...prev, source: e.target.value || undefined }))}
        className="w-full p-2 border border-border-default rounded text-sm"
       >
        <option value="">All sources</option>
        {filterOptions.sources.map(source => (
         <option key={source} value={source}>{source}</option>
        ))}
       </select>
      </div>

      <div>
       <label className="block text-sm font-medium text-primary mb-1">Category</label>
       <select
        value={filters.category || ''}
        onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value || undefined }))}
        className="w-full p-2 border border-border-default rounded text-sm"
       >
        <option value="">All categories</option>
        {filterOptions.categories.map(category => (
         <option key={category} value={category}>{category}</option>
        ))}
       </select>
      </div>

      <div>
       <label className="block text-sm font-medium text-primary mb-1">Date From</label>
       <input
        type="datetime-local"
        value={filters.dateFrom || ''}
        onChange={(e) => setFilters(prev => ({ ...prev, dateFrom: e.target.value || undefined }))}
        className="w-full p-2 border border-border-default rounded text-sm"
       />
      </div>
     </div>
    </div>
   )}

   {/* Logs list */}
   <div className="flex-1 overflow-hidden">
    <div className="h-full overflow-y-auto" style={{ height }}>
     {filteredLogs.length === 0 ? (
      <div className="flex items-center justify-center h-full text-muted">
       No logs found
      </div>
     ) : (
      <div className="space-y-1">
       {filteredLogs.map((log) => {
        const { icon: Icon, color, bg } = getLogLevelStyle(log.log_level);

        const isSuccessResult = log.log_category === 'integration_results' && log.log_level === 'info';

        return (
         <div
          key={log.id}
          className={`p-3 border-l-4 hover:bg-base cursor-pointer ${
           log.log_level === 'error' || log.log_level === 'fatal'
            ? 'border-red-500 bg-red-50'
            : log.log_level === 'warn'
            ? 'border-yellow-500 bg-yellow-50'
            : isSuccessResult
            ? 'border-green-500 bg-green-50'
            : 'border-border-default'
          }`}
          onClick={() => setSelectedLog(selectedLog?.id === log.id ? null : log)}
         >
          <div className="flex items-start space-x-3">
           <Icon className={`w-4 h-4 mt-0.5 ${color}`} />

           <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
             <div className="flex items-center space-x-2">
              <span className={`px-2 py-1 rounded text-xs font-medium ${bg} ${color}`}>
               {log.log_level.toUpperCase()}
              </span>
              <span className="text-xs text-muted">
               {log.log_source}
              </span>
              {log.log_category && (
               <span className="text-xs text-muted bg-input px-2 py-1 rounded">
                {log.log_category}
               </span>
              )}
             </div>

             <div className="flex items-center space-x-2 text-xs text-muted">
              {log.execution_time_ms && (
               <span>{log.execution_time_ms}ms</span>
              )}
              <span>{formatTimestamp(log.logged_at)}</span>
             </div>
            </div>

            <p className="mt-1 text-sm text-primary break-words">
             {log.message}
            </p>

            {/* Show success metrics prominently for integration results */}
            {renderSuccessMetrics(log)}

            {selectedLog?.id === log.id && (
             <div className="mt-2 space-y-2">
              {log.container_id && (
               <div className="text-xs text-muted">
                Container: {log.container_id}
               </div>
              )}

              {log.structured_data && Object.keys(log.structured_data).length > 0 && (
               <div>
                <div className="text-xs font-medium text-primary mb-1">Structured Data:</div>
                {renderStructuredData(log.structured_data)}
               </div>
              )}

              {log.metadata && Object.keys(log.metadata).length > 0 && (
               <div>
                <div className="text-xs font-medium text-primary mb-1">Metadata:</div>
                {renderStructuredData(log.metadata)}
               </div>
              )}
             </div>
            )}
           </div>
          </div>
         </div>
        );
       })}
      </div>
     )}
    </div>
   </div>
  </div>
 );
}