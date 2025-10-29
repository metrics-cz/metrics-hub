'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { ArrowLeft, Save, X, Settings, AlertCircle } from 'lucide-react';
import { useActiveCompany } from '@/lib/activeCompany';
import { cachedApi } from '@/lib/cachedApi';
import { CompanyApplication } from '@/lib/applications';
import { NotificationInput } from '@/components/company/integrations/NotificationInput';
import { MetricConfig } from '@/components/company/integrations/MetricConfig';
import { FrequencySelector } from '@/components/company/integrations/FrequencySelector';
import { AccountSelector } from '@/components/company/integrations/AccountSelector';

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
     <div className="h-8 bg-card rounded w-1/4 mb-8"></div>
     <div className="space-y-4">
      {[...Array(5)].map((_, i) => (
       <div key={i} className="h-16 bg-card rounded"></div>
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
     <div className="w-16 h-16 bg-input rounded-xl flex items-center justify-center mx-auto mb-4">
      <AlertCircle className="w-8 h-8 text-muted" />
     </div>
     <h3 className="text-primary font-medium mb-2">Error Loading Settings</h3>
     <p className="text-secondary text-sm mb-4">{error}</p>
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
     className="p-2 bg-input rounded-lg text-primary hover:bg-hover-strong transition-all duration-200"
    >
     <ArrowLeft className="w-5 h-5" />
    </button>
    <div className="flex items-center gap-3">
     <div className="w-12 h-12 bg-input rounded-lg flex items-center justify-center">
      <Settings className="w-6 h-6 text-accent" />
     </div>
     <div>
      <h1 className="text-2xl font-semibold text-primary">
       {integration?.application?.name} Settings
      </h1>
      <p className="text-secondary text-sm">
       Configure automation parameters and notifications
      </p>
     </div>
    </div>
   </div>

   {/* Settings Form */}
   <div className="space-y-8">
    
    {/* Account Selection */}
    <div className="bg-card border border-border-light rounded-xl p-6">
     <h3 className="text-lg font-semibold text-primary mb-4">Account Selection</h3>
     <div className="space-y-4">
      <div>
       <label className="block text-sm font-medium text-secondary mb-2">
        Account Type
       </label>
       <AccountSelector
        accountType={settings.accountSelection?.type || 'mcc'}
        mccEmail="viktorymcc@gmail.com"
        onChange={(type) => setSettings(prev => ({
         ...prev,
         accountSelection: { ...prev.accountSelection, type }
        }))}
       />
      </div>
     </div>
    </div>

    {/* Execution Frequency */}
    <div className="bg-card border border-border-light rounded-xl p-6">
     <div className="flex justify-between items-center mb-4">
      <h3 className="text-lg font-semibold text-primary">Execution Frequency</h3>
      <div className="text-right">
       <span className="text-2xl font-bold text-accent">
        ${getCurrentPrice()}
       </span>
       <span className="text-sm text-secondary">/month</span>
      </div>
     </div>
     <FrequencySelector
      selected={settings.scriptConfig?.frequency || '24h'}
      pricing={FREQUENCY_PRICING}
      onChange={(frequency) => setSettings(prev => ({
       ...prev,
       scriptConfig: { ...prev.scriptConfig!, frequency }
      }))}
     />
    </div>

    {/* Monitored Metrics */}
    <div className="bg-card border border-border-light rounded-xl p-6">
     <h3 className="text-lg font-semibold text-primary mb-4">Monitored Metrics</h3>
     <div className="space-y-4">
      {Object.entries(settings.guardMetrics || {}).map(([metricKey, metricValue]) => (
       <MetricConfig
        key={metricKey}
        name={metricKey}
        enabled={metricValue.enabled}
        dropThreshold={metricValue.dropThreshold}
        onEnabledChange={(enabled) => setSettings(prev => ({
         ...prev,
         guardMetrics: {
          ...prev.guardMetrics!,
          [metricKey]: { ...metricValue, enabled }
         }
        }))}
        onThresholdChange={(dropThreshold) => setSettings(prev => ({
         ...prev,
         guardMetrics: {
          ...prev.guardMetrics!,
          [metricKey]: { ...metricValue, dropThreshold }
         }
        }))}
       />
      ))}
     </div>
    </div>

    {/* Monitoring Period */}
    <div className="bg-card border border-border-light rounded-xl p-6">
     <h3 className="text-lg font-semibold text-primary mb-4">Monitoring Period</h3>
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
          ? 'border-primary-500 bg-primary-50'
          : 'border-border-default hover:border-primary-300'
        }`}>
         <div className="text-center">
          <div className="font-semibold text-sm text-primary">{period.label}</div>
          <div className="text-xs text-secondary">{period.description}</div>
         </div>
        </div>
       </label>
      ))}
     </div>
    </div>

    {/* Output Delivery Options */}
    <div className="bg-card border border-border-light rounded-xl p-6">
     <h3 className="text-lg font-semibold text-primary mb-4">Output Delivery Options</h3>
     <div className="space-y-4">
      <NotificationInput
       type="email"
       enabled={settings.notifications?.email?.enabled || false}
       value={settings.notifications?.email?.address || ''}
       onEnabledChange={(enabled) => setSettings(prev => ({
        ...prev,
        notifications: {
         ...prev.notifications!,
         email: { ...prev.notifications?.email!, enabled }
        }
       }))}
       onValueChange={(address) => setSettings(prev => ({
        ...prev,
        notifications: {
         ...prev.notifications!,
         email: { ...prev.notifications?.email!, address }
        }
       }))}
      />

      <NotificationInput
       type="slack"
       enabled={settings.notifications?.slack?.enabled || false}
       value={settings.notifications?.slack?.webhook || ''}
       onEnabledChange={(enabled) => setSettings(prev => ({
        ...prev,
        notifications: {
         ...prev.notifications!,
         slack: { ...prev.notifications?.slack!, enabled }
        }
       }))}
       onValueChange={(webhook) => setSettings(prev => ({
        ...prev,
        notifications: {
         ...prev.notifications!,
         slack: { ...prev.notifications?.slack!, webhook }
        }
       }))}
      />

      <NotificationInput
       type="discord"
       enabled={settings.notifications?.discord?.enabled || false}
       value={settings.notifications?.discord?.webhook || ''}
       onEnabledChange={(enabled) => setSettings(prev => ({
        ...prev,
        notifications: {
         ...prev.notifications!,
         discord: { ...prev.notifications?.discord!, enabled }
        }
       }))}
       onValueChange={(webhook) => setSettings(prev => ({
        ...prev,
        notifications: {
         ...prev.notifications!,
         discord: { ...prev.notifications?.discord!, webhook }
        }
       }))}
      />

      <NotificationInput
       type="whatsapp"
       enabled={settings.notifications?.whatsapp?.enabled || false}
       value={settings.notifications?.whatsapp?.webhook || ''}
       onEnabledChange={(enabled) => setSettings(prev => ({
        ...prev,
        notifications: {
         ...prev.notifications!,
         whatsapp: { ...prev.notifications?.whatsapp!, enabled }
        }
       }))}
       onValueChange={(webhook) => setSettings(prev => ({
        ...prev,
        notifications: {
         ...prev.notifications!,
         whatsapp: { ...prev.notifications?.whatsapp!, webhook }
        }
       }))}
      />
     </div>
    </div>

    {/* Save/Cancel Buttons */}
    <div className="flex justify-end gap-4">
     <button
      onClick={() => router.back()}
      className="px-6 py-2 bg-input text-primary rounded-lg hover:bg-hover-strong transition-all duration-200"
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