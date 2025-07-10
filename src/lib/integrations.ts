// TypeScript interfaces for integrations and automations

export interface Integration {
  id: string;
  integration_key: string;
  name: string;
  description?: string;
  icon_url?: string;
  provider?: string;
  auth_type: 'oauth2' | 'api_key' | 'webhook';
  auth_config: Record<string, any>;
  supported_features: string[];
  documentation_url?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CompanyIntegration {
  id: string;
  company_id: string;
  integration_id: string;
  name?: string;
  status: 'active' | 'inactive' | 'error' | 'pending';
  connected_at: string;
  connected_by?: string;
  auth_data: Record<string, any>;
  config: Record<string, any>;
  last_sync_at?: string;
  sync_status: 'pending' | 'syncing' | 'success' | 'error';
  error_message?: string;
  created_at: string;
  updated_at: string;
  integration?: Integration;
}

export interface Automation {
  id: string;
  script_key: string;
  name: string;
  description?: string;
  icon_url?: string;
  category: 'monitoring' | 'optimization' | 'reporting';
  trigger_type: 'schedule' | 'webhook' | 'manual';
  supported_frequencies: string[];
  supported_metrics: string[];
  pricing_model: 'frequency' | 'flat' | 'usage';
  pricing_config: Record<string, number>;
  default_config: Record<string, any>;
  documentation_url?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CompanyAutomation {
  id: string;
  company_id: string;
  automation_id: string;
  integration_id?: string;
  name?: string;
  is_active: boolean;
  frequency: string;
  metrics_watched: MetricWatcher[];
  period_days: number;
  price_per_month: number;
  notification_channels: NotificationChannels;
  config: Record<string, any>;
  last_run_at?: string;
  next_run_at?: string;
  run_count: number;
  success_count: number;
  error_count: number;
  last_error_message?: string;
  created_at: string;
  updated_at: string;
  created_by?: string;
  automation?: Automation;
  integration?: CompanyIntegration;
}

export interface MetricWatcher {
  metric: string;
  enabled: boolean;
  drop_threshold: number;
}

export interface NotificationChannels {
  email?: {
    enabled: boolean;
    address: string;
  };
  slack?: {
    enabled: boolean;
    webhook: string;
  };
  discord?: {
    enabled: boolean;
    webhook: string;
  };
  whatsapp?: {
    enabled: boolean;
    webhook: string;
  };
}

export interface AutomationRun {
  id: string;
  company_automation_id: string;
  status: 'running' | 'success' | 'error' | 'cancelled';
  started_at: string;
  completed_at?: string;
  duration_ms?: number;
  results: Record<string, any>;
  error_message?: string;
  logs: LogEntry[];
  triggered_by: 'schedule' | 'manual' | 'webhook';
  created_at: string;
}

export interface LogEntry {
  timestamp: string;
  level: 'info' | 'warn' | 'error';
  message: string;
  data?: Record<string, any>;
}

// Helper functions for working with integrations and automations

/**
 * Get all available integrations
 */
export async function fetchAvailableIntegrations(): Promise<Integration[]> {
  try {
    const response = await fetch('/api/integrations');
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Failed to fetch integrations');
    }
    
    return data.data;
  } catch (error) {
    console.error('Error fetching integrations:', error);
    throw error;
  }
}

/**
 * Get all available automations
 */
export async function fetchAvailableAutomations(): Promise<Automation[]> {
  try {
    const response = await fetch('/api/automations');
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Failed to fetch automations');
    }
    
    return data.data;
  } catch (error) {
    console.error('Error fetching automations:', error);
    throw error;
  }
}

/**
 * Get company's connected integrations
 */
export async function fetchCompanyIntegrations(companyId: string): Promise<CompanyIntegration[]> {
  try {
    const response = await fetch(`/api/company/${companyId}/integrations`);
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Failed to fetch company integrations');
    }
    
    return data.data;
  } catch (error) {
    console.error('Error fetching company integrations:', error);
    throw error;
  }
}

/**
 * Get company's automations
 */
export async function fetchCompanyAutomations(companyId: string): Promise<CompanyAutomation[]> {
  try {
    const response = await fetch(`/api/company/${companyId}/automations`);
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Failed to fetch company automations');
    }
    
    return data.data;
  } catch (error) {
    console.error('Error fetching company automations:', error);
    throw error;
  }
}

/**
 * Connect an integration for a company
 */
export async function connectIntegration(
  companyId: string, 
  integrationId: string, 
  config: Record<string, any> = {},
  authData: Record<string, any> = {}
): Promise<CompanyIntegration> {
  try {
    const response = await fetch(`/api/company/${companyId}/integrations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ integrationId, config, authData }),
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Failed to connect integration');
    }
    
    return data.data;
  } catch (error) {
    console.error('Error connecting integration:', error);
    throw error;
  }
}

/**
 * Install an automation for a company
 */
export async function installAutomation(
  companyId: string,
  automationId: string,
  options: {
    integrationId?: string;
    frequency?: string;
    metricsWatched?: MetricWatcher[];
    periodDays?: number;
    notificationChannels?: NotificationChannels;
    config?: Record<string, any>;
  } = {}
): Promise<CompanyAutomation> {
  try {
    const response = await fetch(`/api/company/${companyId}/automations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ automationId, ...options }),
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Failed to install automation');
    }
    
    return data.data;
  } catch (error) {
    console.error('Error installing automation:', error);
    throw error;
  }
}

/**
 * Update automation settings
 */
export async function updateAutomationSettings(
  companyId: string,
  automationId: string,
  settings: Partial<CompanyAutomation>
): Promise<CompanyAutomation> {
  try {
    const response = await fetch(`/api/company/${companyId}/automations/${automationId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(settings),
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Failed to update automation settings');
    }
    
    return data.data;
  } catch (error) {
    console.error('Error updating automation settings:', error);
    throw error;
  }
}