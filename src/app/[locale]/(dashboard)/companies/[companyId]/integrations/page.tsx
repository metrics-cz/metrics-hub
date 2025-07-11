'use client';

import { useState, useEffect } from 'react';
import { useParams, usePathname, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Plus, Trash2, Settings, MessageSquare, FileSpreadsheet, Target, Mail, BarChart3, Trello, AlertCircle } from 'lucide-react';
import { useActiveCompany } from '@/lib/activeCompany';
import { useCompanyListLoading } from '@/lib/companyList';
import { cachedApi } from '@/lib/cachedApi';
import { CompanyApplication } from '@/lib/applications';
import { canManageIntegrationSettings, canManageIntegrations } from '@/lib/permissions';

interface Integration {
  id: string;
  name: string;
  description: string;
  category: string;
  iconUrl: string;
  rating: number;
  downloads: number;
  isInstalled: boolean;
  isPremium: boolean;
  tags: string[];
  installedAt?: string;
  isActive?: boolean;
  configuration?: Record<string, any>;
  settings?: Record<string, any>;
  type?: string; // "integration" or "automation"
  status?: string; // "active" or "inactive"
  connectedAccountsCount?: number;
  linkedAutomationsCount?: number;
}

// Fallback icon component for when image fails to load
const FallbackIcon = ({ className }: { className?: string }) => (
  <Settings className={className} />
);

// Integration icon component with fallback
const IntegrationIcon = ({ iconUrl, integrationName, className }: { iconUrl?: string; integrationName: string; className?: string }) => {
  const [hasError, setHasError] = useState(false);

  if (!iconUrl || hasError) {
    return <FallbackIcon className={className} />;
  }

  return (
    <img
      src={iconUrl}
      alt={`${integrationName} icon`}
      className={className}
      onError={() => setHasError(true)}
      onLoad={() => setHasError(false)}
    />
  );
};

export default function IntegrationsPage() {
  const t = useTranslations('integrations');
  const company = useActiveCompany();
  const companyLoading = useCompanyListLoading();
  const router = useRouter();
  
  // Permission checks
  const canManageSettings = canManageIntegrationSettings(company?.userRole);
  const canManage = canManageIntegrations(company?.userRole);
  const [installedIntegrations, setInstalledIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uninstalling, setUninstalling] = useState<string | null>(null);

  // Convert CompanyApplication to Integration format
  const convertToIntegration = (companyApp: CompanyApplication): Integration => {
    const app = companyApp.application;
    if (!app) throw new Error('Application data missing');

    // Determine type from category or metadata
    const type = app.category === 'automation' ? 'Automation' : 'Integration';
    
    // Determine status from company application
    const status = companyApp.is_active ? 'Active' : 'Inactive';
    
    // Calculate connected accounts from settings
    const connectedAccountsCount = getConnectedAccountsCount(companyApp.settings);

    return {
      id: app.id,
      name: app.name,
      description: app.description,
      category: app.category,
      iconUrl: app.icon_url || '',
      rating: app.rating,
      downloads: app.download_count,
      isInstalled: companyApp.is_active,
      isPremium: app.is_premium,
      tags: app.tags || [],
      installedAt: companyApp.installed_at,
      isActive: companyApp.is_active,
      configuration: companyApp.configuration,
      settings: companyApp.settings,
      type,
      status,
      connectedAccountsCount,
      linkedAutomationsCount: type === 'Automation' ? 1 : 0
    };
  };

  // Helper function to count connected accounts from settings
  const getConnectedAccountsCount = (settings: any): number => {
    if (!settings) return 0;
    
    // For Google Ads Guard, count configured accounts
    if (settings.accountSelection?.selectedAccountId) {
      return 1;
    }
    
    return 0;
  };

  // Fetch installed integrations (filter by automation category)
  useEffect(() => {
    const fetchInstalledIntegrations = async () => {
      if (!company?.id) return;

      try {
        setLoading(true);
        setError(null);

        const companyApplications = await cachedApi.fetchCompanyApplications(company.id);
        const convertedIntegrations = companyApplications
          .filter(ca => ca.application && ca.application.category === 'automation') // Only automation category
          .map(convertToIntegration);
        
        setInstalledIntegrations(convertedIntegrations);
      } catch (error) {
        console.error('Error fetching installed integrations:', error);
        setError('Failed to load installed integrations');
      } finally {
        setLoading(false);
      }
    };

    fetchInstalledIntegrations();
  }, [company?.id]);

  const handleConfigureIntegration = (integrationId: string) => {
    // Navigate to integration settings page
    router.push(`/companies/${company?.id}/integrations/${integrationId}/settings`);
  };

  const handleRemoveIntegration = async (integrationId: string) => {
    if (!company?.id) return;
    
    const integration = installedIntegrations.find(i => i.id === integrationId);
    if (!integration) return;

    if (!confirm(`Are you sure you want to uninstall ${integration.name}?`)) {
      return;
    }

    setUninstalling(integrationId);
    
    try {
      await cachedApi.uninstallApplication(company.id, integrationId);
      setInstalledIntegrations(prev => prev.filter(integration => integration.id !== integrationId));
      // Show success message
      alert(`${integration.name} has been uninstalled successfully`);
    } catch (error) {
      console.error('Error uninstalling integration:', error);
      alert(error instanceof Error ? error.message : 'Failed to uninstall integration');
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
          <h3 className="dark:text-white text-gray-900 font-medium mb-2">Failed to Load Integrations</h3>
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
        {canManage && (
          <button
            className="bg-primary-600 text-white rounded-lg px-4 py-2.5 hover:bg-primary-700 transition-all duration-200 inline-flex items-center gap-2 shadow-sm font-medium text-sm"
            onClick={() => router.push('/marketplace')}>
            <Plus className="w-4 h-4" />
            {t('addIntegration')}
          </button>
        )}
      </div>

      {installedIntegrations.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-16 h-16 dark:bg-gray-800 bg-gray-100 rounded-xl flex items-center justify-center mx-auto mb-4">
            <Plus className="w-8 h-8 dark:text-gray-400 text-gray-500" />
          </div>
          <h3 className="dark:text-white text-gray-900 font-medium mb-2">{t('noIntegrationsInstalled')}</h3>
          <p className="dark:text-gray-400 text-gray-600 mb-6 text-sm">
            {t('noIntegrationsSubtitle')}
          </p>
          {canManage ? (
            <button
              className="bg-primary-600 text-white rounded-lg px-6 py-3 hover:bg-primary-700 transition-all duration-200 inline-flex items-center gap-2 shadow-sm font-medium"
              onClick={() => router.push('/marketplace')}>
              <Plus className="w-4 h-4" />
              {t('browseMarketplace')}
            </button>
          ) : (
            <div className="text-sm dark:text-gray-500 text-gray-400 py-3 px-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              Contact an admin to install integrations
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {installedIntegrations.map((integration) => {
            return (
              <div
                key={integration.id}
                className="dark:bg-gray-800 bg-white border dark:border-gray-700 border-gray-200 rounded-xl p-6 hover:shadow-lg transition-all duration-200"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 dark:bg-gray-500 bg-gray-100 rounded-lg flex items-center justify-center">
                      <IntegrationIcon 
                        iconUrl={integration.iconUrl} 
                        integrationName={integration.name} 
                        className="w-6 h-6 text-primary-600 dark:text-primary-400" 
                      />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold dark:text-white text-gray-900 text-sm">{integration.name}</h3>
                        <span className={`inline-block px-2 py-0.5 text-xs rounded-full font-medium ${
                          integration.type === 'Automation' 
                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
                            : 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                        }`}>
                          {integration.type}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs dark:text-gray-400 text-gray-600">
                        <div className="flex items-center gap-1">
                          <div className={`w-2 h-2 rounded-full ${
                            integration.status === 'Active' 
                              ? 'bg-green-500' 
                              : 'bg-gray-400'
                          }`}></div>
                          <span>{integration.status}</span>
                        </div>
                        <span>•</span>
                        <span>{integration.connectedAccountsCount || 0} connected</span>
                        {integration.isPremium && (
                          <>
                            <span>•</span>
                            <span className="text-amber-600 dark:text-amber-400 font-medium">Premium</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <p className="dark:text-gray-400 text-gray-600 text-sm mb-4 leading-relaxed">
                  {integration.description}
                </p>

                <div className="flex gap-3 pt-4 border-t dark:border-gray-700 border-gray-200">
                  {canManageSettings && (
                    <button
                      onClick={() => handleConfigureIntegration(integration.id)}
                      className="px-4 py-2 dark:bg-gray-700 bg-gray-100 dark:text-white text-gray-900 rounded-lg hover:dark:bg-gray-600 hover:bg-gray-200 transition-all duration-200"
                      title={t('configureIntegration')}
                    >
                      <Settings className="w-4 h-4" />
                    </button>
                  )}
                  
                  {canManage && (
                    <button
                      onClick={() => handleRemoveIntegration(integration.id)}
                      disabled={uninstalling === integration.id}
                      className="px-4 py-2 dark:bg-red-900/20 bg-red-50 dark:text-red-400 text-red-600 rounded-lg hover:dark:bg-red-900/30 hover:bg-red-100 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                      title={t('removeIntegration')}
                    >
                      {uninstalling === integration.id ? (
                        <div className="w-4 h-4 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </button>
                  )}
                  
                  {!canManageSettings && !canManage && (
                    <div className="text-xs dark:text-gray-500 text-gray-400 py-2 px-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      Contact admin to manage this integration
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}