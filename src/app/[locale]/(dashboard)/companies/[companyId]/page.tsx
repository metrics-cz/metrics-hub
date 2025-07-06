'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Activity, AlertTriangle, CheckCircle, Zap } from 'lucide-react';
import Link from 'next/link';

interface DashboardStats {
  activeIntegrations: number;
  activeAutomations: number;
  jobsLast24h: number;
  errorsLast24h: number;
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
  const [stats, setStats] = useState<DashboardStats>({
    activeIntegrations: 0,
    activeAutomations: 0,
    jobsLast24h: 0,
    errorsLast24h: 0,
  });
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [filter, setFilter] = useState<'all' | 'success' | 'error'>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // TODO: Replace with real API calls
    // For now, using mock data to demonstrate the UI
    const mockStats: DashboardStats = {
      activeIntegrations: 5,
      activeAutomations: 8,
      jobsLast24h: 142,
      errorsLast24h: 3,
    };

    const mockActivities: ActivityItem[] = [
      {
        id: '1',
        type: 'success',
        integration: 'Google Sheets',
        automation: 'Denní export dat',
        timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString(), // 15 minutes ago
        result: 'Data úspěšně exportována (247 řádků)',
      },
      {
        id: '2',
        type: 'success',
        integration: 'Slack',
        automation: 'Týdenní report',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), // 2 hours ago
        result: 'Report odeslán do #general kanálu',
      },
      {
        id: '3',
        type: 'error',
        integration: 'Gmail',
        automation: 'Email kampaň',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString(), // 4 hours ago
        result: 'Chyba: Překročen denní limit API',
      },
      {
        id: '4',
        type: 'success',
        integration: 'Trello',
        automation: 'Sync úkolů',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 6).toISOString(), // 6 hours ago
        result: 'Synchronizováno 23 karet',
      },
    ];

    setStats(mockStats);
    setActivities(mockActivities);
    setLoading(false);
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
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-8"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 min-h-screen">
      <h1 className="text-3xl font-semibold mb-8">Dashboard</h1>

      {/* KPI Widgets */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Link href={`/companies/${companyId}/integrations`}>
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-primary-500/50 transition-colors cursor-pointer shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Aktivní integrace</p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">{stats.activeIntegrations}</p>
              </div>
              <div className="w-12 h-12 bg-primary-500/20 rounded-lg flex items-center justify-center">
                <Zap className="w-6 h-6 text-primary-600 dark:text-primary-400" />
              </div>
            </div>
          </div>
        </Link>

        <Link href={`/companies/${companyId}/integrations`}>
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-primary-500/50 transition-colors cursor-pointer shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Aktivní automatizace</p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">{stats.activeAutomations}</p>
              </div>
              <div className="w-12 h-12 bg-green-500/20 rounded-lg flex items-center justify-center">
                <Activity className="w-6 h-6 text-green-400" />
              </div>
            </div>
          </div>
        </Link>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-neutral-400">Proběhlé úlohy (24h)</p>
              <p className="text-2xl font-semibold text-white">{stats.jobsLast24h}</p>
            </div>
            <div className="w-12 h-12 bg-purple-500/20 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-purple-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-neutral-400">Chybové stavy (24h)</p>
              <p className="text-2xl font-semibold text-white">{stats.errorsLast24h}</p>
            </div>
            <div className="w-12 h-12 bg-red-500/20 rounded-lg flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-red-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Activity Feed */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Poslední aktivita</h2>
            <div className="flex gap-2">
              <button
                onClick={() => setFilter('all')}
                className={`px-3 py-1 text-sm rounded transition-colors ${
                  filter === 'all'
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-500 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                Vše
              </button>
              <button
                onClick={() => setFilter('success')}
                className={`px-3 py-1 text-sm rounded transition-colors ${
                  filter === 'success'
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-500 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                Úspěšné
              </button>
              <button
                onClick={() => setFilter('error')}
                className={`px-3 py-1 text-sm rounded transition-colors ${
                  filter === 'error'
                    ? 'bg-red-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-500 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                Chybné
              </button>
            </div>
          </div>
        </div>

        <div className="divide-y divide-white/10">
          {filteredActivities.length === 0 ? (
            <div className="p-8 text-center text-neutral-500">
              {filter === 'all' ? 'Žádná aktivita' : `Žádné ${filter === 'success' ? 'úspěšné' : 'chybné'} záznamy`}
            </div>
          ) : (
            filteredActivities.map((activity) => (
              <div key={activity.id} className="p-4 hover:bg-white/5 transition-colors">
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
                      <span className="font-medium text-white">{activity.integration}</span>
                      <span className="text-neutral-400">•</span>
                      <span className="text-neutral-300">{activity.automation}</span>
                      <span className="text-sm text-neutral-500 ml-auto">
                        {formatTimeAgo(activity.timestamp)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{activity.result}</p>
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