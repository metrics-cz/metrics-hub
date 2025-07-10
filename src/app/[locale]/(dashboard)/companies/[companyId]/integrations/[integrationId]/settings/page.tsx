'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { ArrowLeft, Save, X, Settings, AlertCircle } from 'lucide-react';
import { useActiveCompany } from '@/lib/activeCompany';
import { cachedApi } from '@/lib/cachedApi';
import { CompanyApplication } from '@/lib/applications';

interface IntegrationSettings {
  // Google Ads Guard specific settings
  accountSelection?: {
    type: 'mcc' | 'direct';
    mccEmail?: string;
    selectedAccountId?: string;
  };
  scriptConfig?: {
    scriptId: string;
    scriptUrl: string;
    frequency: '4h' | '8h' | '12h' | '24h' | '48h';
  };
  guardMetrics?: {
    impressions: { enabled: boolean; dropThreshold: number };
    clicks: { enabled: boolean; dropThreshold: number };
    conversions: { enabled: boolean; dropThreshold: number };
    value: { enabled: boolean; dropThreshold: number };
    price: { enabled: boolean; dropThreshold: number };
  };
  guardPeriod?: '7' | '14' | '30';
  notifications?: {
    email: { enabled: boolean; address: string };
    slack: { enabled: boolean; webhook: string };
    discord: { enabled: boolean; webhook: string };
    whatsapp: { enabled: boolean; webhook: string };
  };
}

const FREQUENCY_PRICING = {
  '4h': 50,
  '8h': 40,
  '12h': 30,
  '24h': 20,
  '48h': 15
};

export default function IntegrationSettingsPage() {
  const { companyId, integrationId } = useParams<{ companyId: string; integrationId: string }>();
  const router = useRouter();
  const t = useTranslations('integrations');
  const company = useActiveCompany();
  
  const [integration, setIntegration] = useState<CompanyApplication | null>(null);
  const [settings, setSettings] = useState<IntegrationSettings>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load integration data and settings
  useEffect(() => {
    const loadIntegration = async () => {
      if (!company?.id || !integrationId) return;

      try {
        setLoading(true);
        setError(null);

        // Fetch the specific integration
        const companyApplications = await cachedApi.fetchCompanyApplications(company.id);
        const foundIntegration = companyApplications.find(ca => ca.application_id === integrationId);
        
        if (!foundIntegration) {
          setError('Integration not found');
          return;
        }

        setIntegration(foundIntegration);
        
        // Load existing settings or set defaults
        const existingSettings = foundIntegration.settings || {};
        setSettings({
          accountSelection: existingSettings.accountSelection || {
            type: 'mcc',
            mccEmail: 'viktorymcc@gmail.com'
          },
          scriptConfig: existingSettings.scriptConfig || {
            scriptId: '8426813',
            scriptUrl: 'https://ads.google.com/aw/bulk/scripts/edit?ocid=381897981&ascid=381897981&scriptId=8426813&euid=374638237&__u=8924148213&uscid=381897981&__c=4437590869&authuser=0&subid=cz-cs-awhp-g-aw-c-home-signin!o2-adshp-hv-q4-22',
            frequency: '24h'
          },
          guardMetrics: existingSettings.guardMetrics || {
            impressions: { enabled: true, dropThreshold: 80 },
            clicks: { enabled: true, dropThreshold: 80 },
            conversions: { enabled: true, dropThreshold: 80 },
            value: { enabled: true, dropThreshold: 80 },
            price: { enabled: true, dropThreshold: 80 }
          },
          guardPeriod: existingSettings.guardPeriod || '7',
          notifications: existingSettings.notifications || {
            email: { enabled: false, address: '' },
            slack: { enabled: false, webhook: '' },
            discord: { enabled: false, webhook: '' },
            whatsapp: { enabled: false, webhook: '' }
          }
        });

      } catch (error) {
        console.error('Error loading integration:', error);
        setError('Failed to load integration settings');
      } finally {
        setLoading(false);
      }
    };

    loadIntegration();
  }, [company?.id, integrationId]);

  const handleSave = async () => {
    if (!company?.id || !integrationId) return;

    setSaving(true);
    try {
      // Update the integration settings
      await cachedApi.updateApplicationSettings(company.id, integrationId, settings);
      
      // Show success message and redirect back
      alert('Settings saved successfully');
      router.back();
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const getCurrentPrice = () => {
    const frequency = settings.scriptConfig?.frequency || '24h';
    return FREQUENCY_PRICING[frequency];
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-8"></div>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-200 dark:bg-gray-700 rounded"></div>
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
          <h3 className="dark:text-white text-gray-900 font-medium mb-2">Error Loading Settings</h3>
          <p className="dark:text-gray-400 text-gray-600 text-sm mb-4">{error}</p>
          <button
            onClick={() => router.back()}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-all duration-200"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <button
          onClick={() => router.back()}
          className="p-2 dark:bg-gray-700 bg-gray-100 rounded-lg dark:text-white text-gray-900 hover:dark:bg-gray-600 hover:bg-gray-200 transition-all duration-200"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 dark:bg-gray-600 bg-gray-100 rounded-lg flex items-center justify-center">
            <Settings className="w-6 h-6 text-primary-600 dark:text-primary-400" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
              {integration?.application?.name} Settings
            </h1>
            <p className="dark:text-gray-400 text-gray-600 text-sm">
              Configure automation parameters and notifications
            </p>
          </div>
        </div>
      </div>

      {/* Settings Form */}
      <div className="space-y-8">
        
        {/* Account Selection */}
        <div className="dark:bg-gray-800 bg-white border dark:border-gray-700 border-gray-200 rounded-xl p-6">
          <h3 className="text-lg font-semibold dark:text-white text-gray-900 mb-4">Account Selection</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium dark:text-gray-300 text-gray-700 mb-2">
                Account Type
              </label>
              <div className="space-y-2">
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="mcc"
                    checked={settings.accountSelection?.type === 'mcc'}
                    onChange={(e) => setSettings(prev => ({
                      ...prev,
                      accountSelection: { ...prev.accountSelection, type: 'mcc' as const }
                    }))}
                    className="mr-2"
                  />
                  <span className="text-sm dark:text-gray-300 text-gray-700">MCC Account (viktorymcc@gmail.com)</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="direct"
                    checked={settings.accountSelection?.type === 'direct'}
                    onChange={(e) => setSettings(prev => ({
                      ...prev,
                      accountSelection: { ...prev.accountSelection, type: 'direct' as const }
                    }))}
                    className="mr-2"
                  />
                  <span className="text-sm dark:text-gray-300 text-gray-700">Direct Account</span>
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Execution Frequency */}
        <div className="dark:bg-gray-800 bg-white border dark:border-gray-700 border-gray-200 rounded-xl p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold dark:text-white text-gray-900">Execution Frequency</h3>
            <div className="text-right">
              <span className="text-2xl font-bold text-primary-600 dark:text-primary-400">
                ${getCurrentPrice()}
              </span>
              <span className="text-sm dark:text-gray-400 text-gray-600">/month</span>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            {Object.entries(FREQUENCY_PRICING).map(([freq, price]) => (
              <label key={freq} className="relative">
                <input
                  type="radio"
                  value={freq}
                  checked={settings.scriptConfig?.frequency === freq}
                  onChange={(e) => setSettings(prev => ({
                    ...prev,
                    scriptConfig: { ...prev.scriptConfig!, frequency: freq as any }
                  }))}
                  className="sr-only"
                />
                <div className={`border-2 rounded-lg p-4 cursor-pointer transition-all duration-200 ${
                  settings.scriptConfig?.frequency === freq
                    ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                    : 'border-gray-300 dark:border-gray-600 hover:border-primary-300'
                }`}>
                  <div className="text-center">
                    <div className="font-semibold text-sm dark:text-white text-gray-900">{freq}</div>
                    <div className="text-xs dark:text-gray-400 text-gray-600">${price}/mo</div>
                  </div>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Monitored Metrics */}
        <div className="dark:bg-gray-800 bg-white border dark:border-gray-700 border-gray-200 rounded-xl p-6">
          <h3 className="text-lg font-semibold dark:text-white text-gray-900 mb-4">Monitored Metrics</h3>
          <div className="space-y-4">
            {Object.entries(settings.guardMetrics || {}).map(([metricKey, metricValue]) => (
              <div key={metricKey} className="flex items-center justify-between p-4 border dark:border-gray-700 border-gray-200 rounded-lg">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={metricValue.enabled}
                    onChange={(e) => setSettings(prev => ({
                      ...prev,
                      guardMetrics: {
                        ...prev.guardMetrics!,
                        [metricKey]: { ...metricValue, enabled: e.target.checked }
                      }
                    }))}
                    className="w-4 h-4 text-primary-600 bg-gray-100 border-gray-300 rounded focus:ring-primary-500 dark:focus:ring-primary-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                  />
                  <span className="text-sm font-medium dark:text-gray-300 text-gray-700 capitalize">
                    {metricKey}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm dark:text-gray-400 text-gray-600">Drop threshold:</span>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={metricValue.dropThreshold}
                    onChange={(e) => setSettings(prev => ({
                      ...prev,
                      guardMetrics: {
                        ...prev.guardMetrics!,
                        [metricKey]: { ...metricValue, dropThreshold: parseInt(e.target.value) }
                      }
                    }))}
                    disabled={!metricValue.enabled}
                    className="w-16 px-2 py-1 text-sm border dark:border-gray-600 border-gray-300 rounded dark:bg-gray-700 dark:text-white bg-white text-gray-900 disabled:opacity-50"
                  />
                  <span className="text-sm dark:text-gray-400 text-gray-600">%</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Monitoring Period */}
        <div className="dark:bg-gray-800 bg-white border dark:border-gray-700 border-gray-200 rounded-xl p-6">
          <h3 className="text-lg font-semibold dark:text-white text-gray-900 mb-4">Monitoring Period</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {[
              { value: '7', label: '7 days', description: 'Short-term monitoring' },
              { value: '14', label: '14 days', description: 'Medium-term monitoring' },
              { value: '30', label: '30 days', description: 'Long-term monitoring' }
            ].map((period) => (
              <label key={period.value} className="relative">
                <input
                  type="radio"
                  value={period.value}
                  checked={settings.guardPeriod === period.value}
                  onChange={(e) => setSettings(prev => ({
                    ...prev,
                    guardPeriod: e.target.value as '7' | '14' | '30'
                  }))}
                  className="sr-only"
                />
                <div className={`border-2 rounded-lg p-4 cursor-pointer transition-all duration-200 ${
                  settings.guardPeriod === period.value
                    ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                    : 'border-gray-300 dark:border-gray-600 hover:border-primary-300'
                }`}>
                  <div className="text-center">
                    <div className="font-semibold text-sm dark:text-white text-gray-900">{period.label}</div>
                    <div className="text-xs dark:text-gray-400 text-gray-600">{period.description}</div>
                  </div>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Output Delivery Options */}
        <div className="dark:bg-gray-800 bg-white border dark:border-gray-700 border-gray-200 rounded-xl p-6">
          <h3 className="text-lg font-semibold dark:text-white text-gray-900 mb-4">Output Delivery Options</h3>
          <div className="space-y-4">
            
            {/* Email Notifications */}
            <div className="p-4 border dark:border-gray-700 border-gray-200 rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={settings.notifications?.email?.enabled || false}
                    onChange={(e) => setSettings(prev => ({
                      ...prev,
                      notifications: {
                        ...prev.notifications!,
                        email: { ...prev.notifications?.email!, enabled: e.target.checked }
                      }
                    }))}
                    className="w-4 h-4 text-primary-600 bg-gray-100 border-gray-300 rounded focus:ring-primary-500 dark:focus:ring-primary-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                  />
                  <span className="text-sm font-medium dark:text-gray-300 text-gray-700">Email</span>
                </div>
              </div>
              {settings.notifications?.email?.enabled && (
                <input
                  type="email"
                  placeholder="Enter email address"
                  value={settings.notifications?.email?.address || ''}
                  onChange={(e) => setSettings(prev => ({
                    ...prev,
                    notifications: {
                      ...prev.notifications!,
                      email: { ...prev.notifications?.email!, address: e.target.value }
                    }
                  }))}
                  className="w-full px-3 py-2 text-sm border dark:border-gray-600 border-gray-300 rounded dark:bg-gray-700 dark:text-white bg-white text-gray-900 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              )}
            </div>

            {/* Slack Notifications */}
            <div className="p-4 border dark:border-gray-700 border-gray-200 rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={settings.notifications?.slack?.enabled || false}
                    onChange={(e) => setSettings(prev => ({
                      ...prev,
                      notifications: {
                        ...prev.notifications!,
                        slack: { ...prev.notifications?.slack!, enabled: e.target.checked }
                      }
                    }))}
                    className="w-4 h-4 text-primary-600 bg-gray-100 border-gray-300 rounded focus:ring-primary-500 dark:focus:ring-primary-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                  />
                  <span className="text-sm font-medium dark:text-gray-300 text-gray-700">Slack</span>
                </div>
              </div>
              {settings.notifications?.slack?.enabled && (
                <input
                  type="url"
                  placeholder="Enter Slack webhook URL"
                  value={settings.notifications?.slack?.webhook || ''}
                  onChange={(e) => setSettings(prev => ({
                    ...prev,
                    notifications: {
                      ...prev.notifications!,
                      slack: { ...prev.notifications?.slack!, webhook: e.target.value }
                    }
                  }))}
                  className="w-full px-3 py-2 text-sm border dark:border-gray-600 border-gray-300 rounded dark:bg-gray-700 dark:text-white bg-white text-gray-900 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              )}
            </div>

            {/* Discord Notifications */}
            <div className="p-4 border dark:border-gray-700 border-gray-200 rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={settings.notifications?.discord?.enabled || false}
                    onChange={(e) => setSettings(prev => ({
                      ...prev,
                      notifications: {
                        ...prev.notifications!,
                        discord: { ...prev.notifications?.discord!, enabled: e.target.checked }
                      }
                    }))}
                    className="w-4 h-4 text-primary-600 bg-gray-100 border-gray-300 rounded focus:ring-primary-500 dark:focus:ring-primary-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                  />
                  <span className="text-sm font-medium dark:text-gray-300 text-gray-700">Discord</span>
                </div>
              </div>
              {settings.notifications?.discord?.enabled && (
                <input
                  type="url"
                  placeholder="Enter Discord webhook URL"
                  value={settings.notifications?.discord?.webhook || ''}
                  onChange={(e) => setSettings(prev => ({
                    ...prev,
                    notifications: {
                      ...prev.notifications!,
                      discord: { ...prev.notifications?.discord!, webhook: e.target.value }
                    }
                  }))}
                  className="w-full px-3 py-2 text-sm border dark:border-gray-600 border-gray-300 rounded dark:bg-gray-700 dark:text-white bg-white text-gray-900 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              )}
            </div>

            {/* WhatsApp Notifications */}
            <div className="p-4 border dark:border-gray-700 border-gray-200 rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={settings.notifications?.whatsapp?.enabled || false}
                    onChange={(e) => setSettings(prev => ({
                      ...prev,
                      notifications: {
                        ...prev.notifications!,
                        whatsapp: { ...prev.notifications?.whatsapp!, enabled: e.target.checked }
                      }
                    }))}
                    className="w-4 h-4 text-primary-600 bg-gray-100 border-gray-300 rounded focus:ring-primary-500 dark:focus:ring-primary-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                  />
                  <span className="text-sm font-medium dark:text-gray-300 text-gray-700">WhatsApp</span>
                </div>
              </div>
              {settings.notifications?.whatsapp?.enabled && (
                <input
                  type="url"
                  placeholder="Enter WhatsApp webhook URL"
                  value={settings.notifications?.whatsapp?.webhook || ''}
                  onChange={(e) => setSettings(prev => ({
                    ...prev,
                    notifications: {
                      ...prev.notifications!,
                      whatsapp: { ...prev.notifications?.whatsapp!, webhook: e.target.value }
                    }
                  }))}
                  className="w-full px-3 py-2 text-sm border dark:border-gray-600 border-gray-300 rounded dark:bg-gray-700 dark:text-white bg-white text-gray-900 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              )}
            </div>
          </div>
        </div>

        {/* Save/Cancel Buttons */}
        <div className="flex justify-end gap-4">
          <button
            onClick={() => router.back()}
            className="px-6 py-2 dark:bg-gray-700 bg-gray-100 dark:text-white text-gray-900 rounded-lg hover:dark:bg-gray-600 hover:bg-gray-200 transition-all duration-200"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>
    </div>
  );
}