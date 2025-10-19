'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Activity, AlertTriangle, CheckCircle, Zap, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import IntegrationResultsWidget from '@/components/integration-logs/IntegrationResultsWidget';

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
}

export default function DashboardPage() {
  const { companyId } = useParams<{ companyId: string }>();
  const t = useTranslations('dashboard');
  const [stats, setStats] = useState<DashboardStats>({
    activeIntegrations: 0,
    totalJobsLast24h: 0,
    errorJobsLast24h: 0,
    successJobsLast24h: 0,
    lastUpdated: new Date().toISOString(),
  });
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [filter, setFilter] = useState<'all' | 'success' | 'error'>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!companyId) return;

      try {
        setLoading(true);
        setError(null);

        const response = await fetch(`/api/companies/${companyId}/dashboard-stats`);

        if (!response.ok) {
          throw new Error(`Failed to fetch dashboard data: ${response.status}`);
        }

        const data = await response.json();

        if (data.success) {
          setStats(data.data.stats);
          setActivities(data.data.activities);
        } else {
          throw new Error(data.error || 'Failed to load dashboard data');
        }
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
        setError(err instanceof Error ? err.message : 'Unknown error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [companyId]);

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diff = Math.floor((now.getTime() - time.getTime()) / 1000);

    if (diff < 60) return 'právě teď';
    if (diff < 3600) return `před ${Math.floor(diff / 60)} min`;
    if (diff < 86400) return `před ${Math.floor(diff / 3600)} h`;
    return `před ${Math.floor(diff / 86400)} d`;
  };

  const filteredActivities = activities.filter(activity => {
    if (filter === 'all') return true;
    return activity.type === filter;
  });

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-8"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="text-center py-16">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-xl flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-8 h-8 text-red-600 dark:text-red-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{t('failedToLoad')}</h3>
          <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">
            {error}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors inline-flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            {t('retry')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 min-h-screen">
      <h1 className="text-3xl font-semibold mb-8">{t('title')}</h1>

      {/* KPI Widgets */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Link href={`/companies/${companyId}/integrations`}>
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-primary-500/50 transition-colors cursor-pointer shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">{t('activeIntegrations')}</p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">{stats.activeIntegrations}</p>
              </div>
              <div className="w-12 h-12 bg-primary-500/20 rounded-lg flex items-center justify-center">
                <Zap className="w-6 h-6 text-primary-600 dark:text-primary-400" />
              </div>
            </div>
          </div>
        </Link>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">{t('successfulJobsLast24h')}</p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">{stats.successJobsLast24h}</p>
            </div>
            <div className="w-12 h-12 bg-green-500/20 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-green-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">{t('totalJobsLast24h')}</p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">{stats.totalJobsLast24h}</p>
            </div>
            <div className="w-12 h-12 bg-purple-500/20 rounded-lg flex items-center justify-center">
              <Activity className="w-6 h-6 text-purple-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">{t('errorJobsLast24h')}</p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">{stats.errorJobsLast24h}</p>
            </div>
            <div className="w-12 h-12 bg-red-500/20 rounded-lg flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-red-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Integration Health Overview */}
      {stats.activeIntegrations > 0 && (
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{t('integrationHealth')}</h2>
            <Link
              href={`/companies/${companyId}/apps`}
              className="text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 text-sm font-medium"
            >
              {t('viewAllIntegrations')}
            </Link>
          </div>
          <IntegrationResultsWidget
            companyId={companyId}
            showSummary={false}
            className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm"
          />
        </div>
      )}

      {/* Activity Feed */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{t('lastActivity')}</h2>
            <div className="flex gap-2">
              <button
                onClick={() => setFilter('all')}
                className={`px-3 py-1 text-sm rounded transition-colors ${
                  filter === 'all'
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-500 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                {t('filterAll')}
              </button>
              <button
                onClick={() => setFilter('success')}
                className={`px-3 py-1 text-sm rounded transition-colors ${
                  filter === 'success'
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-500 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                {t('filterSuccess')}
              </button>
              <button
                onClick={() => setFilter('error')}
                className={`px-3 py-1 text-sm rounded transition-colors ${
                  filter === 'error'
                    ? 'bg-red-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-500 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                {t('filterError')}
              </button>
            </div>
          </div>
        </div>

        <div className="divide-y divide-gray-200 dark:divide-gray-700">
          {filteredActivities.length === 0 ? (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400">
              {filter === 'all' ? t('noActivity') : (filter === 'success' ? t('noSuccessRecords') : t('noErrorRecords'))}
            </div>
          ) : (
            filteredActivities.map((activity) => (
              <div key={activity.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                <div className="flex items-start gap-4">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                    activity.type === 'success'
                      ? 'bg-green-500/20'
                      : activity.type === 'error'
                      ? 'bg-red-500/20'
                      : 'bg-blue-500/20'
                  }`}>
                    {activity.type === 'success' && <CheckCircle className="w-4 h-4 text-green-400" />}
                    {activity.type === 'error' && <AlertTriangle className="w-4 h-4 text-red-400" />}
                    {activity.type === 'info' && <Activity className="w-4 h-4 text-blue-400" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-gray-900 dark:text-white">{activity.integration}</span>
                      <span className="text-gray-400 dark:text-gray-500">•</span>
                      <span className="text-gray-600 dark:text-gray-300">{activity.automation}</span>
                      <span className="text-sm text-gray-500 dark:text-gray-400 ml-auto">
                        {formatTimeAgo(activity.timestamp)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{activity.result}</p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}