'use client';

import { useState, useEffect } from 'react';
import { useParams, usePathname, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Plus, Trash2, MessageSquare, FileSpreadsheet, Target, Mail, BarChart3, Trello, AlertCircle, Play, Settings } from 'lucide-react';
import { useActiveCompany } from '@/lib/activeCompany';
import { useCompanyListLoading } from '@/lib/companyList';
import { cachedApi } from '@/lib/cachedApi';
import { CompanyApplication } from '@/lib/applications';
import IntegrationResultsWidget from '@/components/integration-logs/IntegrationResultsWidget';

interface App {
  id: string;
  name: string;
  description: string;
  category_id: string;
  iconUrl: string;
  isInstalled: boolean;
  isPremium: boolean;
  tags: string[];
  installedAt?: string;
  isActive?: boolean;
  configuration?: Record<string, any>;
  settings?: Record<string, any>;
  companyApplicationId?: string; // ID of the company_application record
  // Iframe support
  execution_type?: string;
}

// Fallback icon component for when image fails to load
const FallbackIcon = ({ className }: { className?: string }) => (
  <MessageSquare className={className} />
);

// App icon component with fallback
const AppIcon = ({ iconUrl, appName, className }: { iconUrl?: string; appName: string; className?: string }) => {
  const [hasError, setHasError] = useState(false);

  if (!iconUrl || hasError) {
    return <FallbackIcon {...(className && { className })} />;
  }

  return (
    <img
      src={iconUrl}
      alt={`${appName} icon`}
      className={className}
      onError={() => setHasError(true)}
      onLoad={() => setHasError(false)}
    />
  );
};

export default function AppsPage() {
  const t = useTranslations('apps');
  const company = useActiveCompany();
  const companyLoading = useCompanyListLoading();
  const router = useRouter();
  const path = usePathname();
  const [installedApps, setInstalledApps] = useState<App[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uninstalling, setUninstalling] = useState<string | null>(null);

  // Convert CompanyApplication to App format
  const convertToApp = (companyApp: CompanyApplication): App => {
    const app = companyApp.application;
    if (!app) throw new Error('Application data missing');

    return {
      id: app.id,
      name: app.name,
      description: app.description,
      category_id: app.category_id,
      iconUrl: app.icon_url || '',
      isInstalled: companyApp.is_active,
      isPremium: app.is_premium,
      tags: app.tags || [],
      installedAt: companyApp.installed_at,
      isActive: companyApp.is_active,
      companyApplicationId: companyApp.id, // Store the company application ID
      execution_type: app.execution_type,
      ...(companyApp.config && { configuration: companyApp.config }),
      ...(companyApp.settings && { settings: companyApp.settings })
    };
  };

  // Fetch installed applications
  useEffect(() => {
    const fetchInstalledApps = async () => {
      if (!company?.id) return;

      try {
        setLoading(true);
        setError(null);

        const companyApplications = await cachedApi.fetchCompanyApplications(company.id);
        const convertedApps = companyApplications
          .filter(ca => ca.application) // Ensure application data exists
          .map(convertToApp);
        
        console.log('Loaded apps:', convertedApps.map(app => ({ 
          id: app.id, 
          name: app.name, 
          execution_type: app.execution_type,
          isIframeApp: app.execution_type === 'iframe',
          shouldBeClickable: app.execution_type === 'iframe'
        })));
        console.log('Apps with iframe execution_type:', convertedApps.filter(app => app.execution_type === 'iframe'));
        
        setInstalledApps(convertedApps);
      } catch (error) {
        console.error('Error fetching installed applications:', error);
        setError('Failed to load installed applications');
      } finally {
        setLoading(false);
      }
    };

    fetchInstalledApps();
  }, [company?.id]);

  const handleLaunchApp = (appId: string) => {
    console.log('🚀 CLICK DETECTED - Launching app:', appId);
    console.log('🚀 Company ID:', company?.id);
    if (!company?.id) {
      console.error('No company ID available');
      return;
    }
    
    // Extract locale from current path
    const pathParts = path.split('/');
    const locale = pathParts[1];
    
    const targetUrl = `/${locale}/companies/${company.id}/apps/${appId}`;
    console.log('Navigating to:', targetUrl);
    router.push(targetUrl);
  };

  const handleConfigureApp = (appId: string) => {
    // TODO: Navigate to app configuration page
    console.log('Configure app:', appId);
  };

  const handleRemoveApp = async (appId: string) => {
    if (!company?.id) return;
    
    const app = installedApps.find(a => a.id === appId);
    if (!app) return;

    if (!confirm(`Are you sure you want to uninstall ${app.name}?`)) {
      return;
    }

    setUninstalling(appId);
    
    try {
      await cachedApi.uninstallApplication(company.id, appId);
      setInstalledApps(prev => prev.filter(app => app.id !== appId));
      // Show success message
      alert(`${app.name} has been uninstalled successfully`);
    } catch (error) {
      console.error('Error uninstalling application:', error);
      alert(error instanceof Error ? error.message : 'Failed to uninstall application');
    } finally {
      setUninstalling(null);
    }
  };

  if (loading || companyLoading) {
    return (
      <div className="p-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-8"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-64 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
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
          <div className="w-16 h-16 dark:bg-gray-700 bg-gray-100 rounded-xl flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 dark:text-gray-400 text-gray-500" />
          </div>
          <h3 className="dark:text-white text-gray-900 font-medium mb-2">Failed to Load Applications</h3>
          <p className="dark:text-gray-400 text-gray-600 text-sm mb-4">
            {error}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-all duration-200"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-3xl font-semibold text-gray-900 dark:text-white mb-2">{t('title')}</h1>
          <p className="dark:text-gray-400 text-gray-600 text-sm">
            {t('subtitle')}
          </p>
        </div>
        <button
          className="bg-primary-600 text-white rounded-lg px-4 py-2.5 hover:bg-primary-700 transition-all duration-200 inline-flex items-center gap-2 shadow-sm font-medium text-sm"
          onClick={() => router.push('/marketplace')}>
          <Plus className="w-4 h-4" />
          {t('addApp')}
        </button>
      </div>

      {/* Integration Health Status */}
      {installedApps.length > 0 && company?.id && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Integration Status</h2>
          <IntegrationResultsWidget
            companyId={company.id}
            showSummary={true}
            className="mb-4"
          />
        </div>
      )}

      {installedApps.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-16 h-16 dark:bg-gray-800 bg-gray-100 rounded-xl flex items-center justify-center mx-auto mb-4">
            <Plus className="w-8 h-8 dark:text-gray-400 text-gray-500" />
          </div>
          <h3 className="dark:text-white text-gray-900 font-medium mb-2">{t('noAppsInstalled')}</h3>
          <p className="dark:text-gray-400 text-gray-600 mb-6 text-sm">
            {t('noAppsSubtitle')}
          </p>
          <button
            className="bg-primary-600 text-white rounded-lg px-6 py-3 hover:bg-primary-700 transition-all duration-200 inline-flex items-center gap-2 shadow-sm font-medium"
            onClick={() => router.push('/marketplace')}>
            <Plus className="w-4 h-4" />
            {t('browseMarketplace')}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {installedApps.map((app) => {
            const isIframeApp = app.execution_type === 'iframe';
            
            return (
              <div
                key={app.id}
                className={`dark:bg-gray-800 bg-white border dark:border-gray-700 border-gray-200 rounded-xl p-6 hover:shadow-lg transition-all duration-200 ${
                  isIframeApp ? 'cursor-pointer hover:border-primary-300 hover:dark:border-primary-700' : ''
                }`}
                onClick={isIframeApp ? () => handleLaunchApp(app.id) : undefined}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 dark:bg-gray-500 bg-gray-100 rounded-lg flex items-center justify-center">
                      <AppIcon 
                        iconUrl={app.iconUrl} 
                        appName={app.name} 
                        className="w-6 h-6 text-primary-600 dark:text-primary-400" 
                      />
                    </div>
                    <div>
                      <h3 className="font-semibold dark:text-white text-gray-900 text-sm">{app.name}</h3>
                      <div className="flex gap-2 mt-1">
                        {app.isPremium && (
                          <span className="inline-block px-2 py-0.5 text-xs bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 rounded-full font-medium">
                            Premium
                          </span>
                        )}
                        {app.execution_type === 'iframe' && (
                          <span className="inline-block px-2 py-0.5 text-xs bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 rounded-full font-medium">
                            Interactive
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-primary-600 dark:text-primary-400">
                    <div className="w-2 h-2 bg-primary-500 rounded-full"></div>
                    <span className="text-xs font-medium">{t('active')}</span>
                  </div>
                </div>

                <p className="dark:text-gray-400 text-gray-600 text-sm mb-4 leading-relaxed">
                  {app.description}
                </p>

                <div 
                  className="flex gap-3 pt-4 border-t dark:border-gray-700 border-gray-200"
                >
                  {/* Launch button for iframe apps */}
                  {isIframeApp && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleLaunchApp(app.id);
                      }}
                      className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-all duration-200 flex items-center justify-center gap-2 font-medium text-sm"
                      title="Launch App"
                    >
                      <Play className="w-4 h-4" />
                      Launch
                    </button>
                  )}
                  
                  {/* Configuration button for other apps */}
                  {app.execution_type !== 'iframe' && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleConfigureApp(app.id);
                      }}
                      className="flex-1 px-4 py-2 dark:bg-gray-700 bg-gray-100 dark:text-gray-300 text-gray-700 rounded-lg hover:dark:bg-gray-600 hover:bg-gray-200 transition-all duration-200 flex items-center justify-center gap-2 font-medium text-sm"
                      title="Configure App"
                    >
                      <Settings className="w-4 h-4" />
                      Configure
                    </button>
                  )}

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveApp(app.id);
                    }}
                    disabled={uninstalling === app.id}
                    className="px-4 py-2 dark:bg-red-900/20 bg-red-50 dark:text-red-400 text-red-600 rounded-lg hover:dark:bg-red-900/30 hover:bg-red-100 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    title={t('removeApp')}
                  >
                    {uninstalling === app.id ? (
                      <div className="w-4 h-4 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}