import { supabase } from '@/lib/supabaseClient';

export type ApplicationType = 'application' | 'integration';

export interface Application {
  id: string;
  name: string;
  description: string;
  long_description?: string;
  category_id: string; // Now required (removed category string)
  type: ApplicationType; // New field to distinguish apps from integrations
  developer: string;
  version: string;
  icon_url?: string;
  screenshots?: string[];
  documentation_url?: string;
  pricing_model: 'free' | 'subscription' | 'one_time';
  price?: string;
  features?: string[];
  tags?: string[];
  rating: number;
  download_count: number;
  is_premium: boolean;
  is_active: boolean;
  metadata?: Record<string, any>; // Keep - used for flexible app-specific data
  created_at: string;
  updated_at: string;
}

export interface ApplicationCategory {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface CompanyApplication {
  id: string;
  company_id: string;
  application_id: string;
  installed_at: string;
  installed_by?: string;
  is_active: boolean;
  config?: Record<string, any>;
  settings?: Record<string, any>;
  last_run_at?: string;
  run_count: number;
  created_at: string;
  updated_at: string;
  application?: Application;
}

export interface ApplicationFilters {
  category?: string;
  type?: ApplicationType; // Filter by application type
  search?: string;
  isPremium?: boolean;
  limit?: number;
  offset?: number;
}

/**
 * Fetch all available applications with optional filtering
 */
export async function fetchApplications(filters: ApplicationFilters = {}): Promise<{
  applications: Application[];
  total: number;
}> {
  try {
    const {
      category,
      type,
      search,
      isPremium,
      limit = 50,
      offset = 0
    } = filters;

    let query = supabase
      .from('applications')
      .select('*', { count: 'exact' })
      .eq('is_active', true)
      .order('rating', { ascending: false })
      .order('download_count', { ascending: false });

    // Apply filters
    if (category && category !== 'all') {
      query = query.eq('category_id', category);
    }

    if (type) {
      query = query.eq('type', type);
    }

    if (isPremium !== undefined) {
      query = query.eq('is_premium', isPremium);
    }

    if (search) {
      query = query.or(
        `name.ilike.%${search}%,description.ilike.%${search}%,tags.cs.{${search}}`
      );
    }

    // Apply pagination
    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      console.error('Error fetching applications:', error);
      throw new Error('Failed to fetch applications');
    }

    return {
      applications: data || [],
      total: count || 0
    };
  } catch (error) {
    console.error('fetchApplications error:', error);
    throw error;
  }
}

/**
 * Fetch a specific application by ID
 */
export async function fetchApplication(id: string): Promise<Application | null> {
  try {
    const { data, error } = await supabase
      .from('applications')
      .select('*')
      .eq('id', id)
      .eq('is_active', true)
      .single();

    if (error) {
      if (error instanceof Error && error.code === 'PGRST116') {
        return null; // Not found
      }
      console.error('Error fetching application:', error);
      throw new Error('Failed to fetch application');
    }

    return data;
  } catch (error) {
    console.error('fetchApplication error:', error);
    throw error;
  }
}

/**
 * Fetch application categories
 */
export async function fetchApplicationCategories(): Promise<ApplicationCategory[]> {
  try {
    const { data, error } = await supabase
      .from('application_categories')
      .select('*')
      .order('sort_order', { ascending: true });

    if (error) {
      console.error('Error fetching application categories:', error);
      throw new Error('Failed to fetch application categories');
    }

    return data || [];
  } catch (error) {
    console.error('fetchApplicationCategories error:', error);
    throw error;
  }
}

/**
 * Fetch installed applications for a company
 */
export async function fetchCompanyApplications(companyId: string): Promise<CompanyApplication[]> {
  try {
    const { data, error } = await supabase
      .from('company_applications')
      .select(`
        *,
        application:applications(*)
      `)
      .eq('company_id', companyId)
      .eq('is_active', true)
      .order('installed_at', { ascending: false });

    if (error) {
      console.error('Error fetching company applications:', error);
      throw new Error('Failed to fetch company applications');
    }

    return data || [];
  } catch (error) {
    console.error('fetchCompanyApplications error:', error);
    throw error;
  }
}

/**
 * Install an application for a company
 */
export async function installApplication(
  companyId: string,
  applicationId: string,
  options: {
    configuration?: Record<string, any>;
    settings?: Record<string, any>;
  } = {}
): Promise<CompanyApplication> {
  try {
    const { configuration = {}, settings = {} } = options;

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('Authentication required');
    }

    // Check if application exists and is active
    const application = await fetchApplication(applicationId);
    if (!application) {
      throw new Error('Application not found or inactive');
    }

    // Check if already installed
    const { data: existing } = await supabase
      .from('company_applications')
      .select('id')
      .eq('company_id', companyId)
      .eq('application_id', applicationId)
      .single();

    if (existing) {
      throw new Error('Application already installed');
    }

    // Install the application
    const { data, error } = await supabase
      .from('company_applications')
      .insert({
        company_id: companyId,
        application_id: applicationId,
        installed_by: user.id,
        configuration,
        settings,
        is_active: true
      })
      .select(`
        *,
        application:applications(*)
      `)
      .single();

    if (error) {
      console.error('Error installing application:', error);
      throw new Error('Failed to install application');
    }

    // Update download count
    await supabase
      .from('applications')
      .update({ 
        download_count: application.download_count + 1 
      })
      .eq('id', applicationId);

    return data;
  } catch (error) {
    console.error('installApplication error:', error);
    throw error;
  }
}

/**
 * Uninstall an application from a company
 */
export async function uninstallApplication(
  companyId: string,
  applicationId: string
): Promise<void> {
  try {
    const { error } = await supabase
      .from('company_applications')
      .delete()
      .eq('company_id', companyId)
      .eq('application_id', applicationId);

    if (error) {
      console.error('Error uninstalling application:', error);
      throw new Error('Failed to uninstall application');
    }
  } catch (error) {
    console.error('uninstallApplication error:', error);
    throw error;
  }
}

/**
 * Update application configuration/settings
 */
export async function updateApplicationSettings(
  companyId: string,
  applicationId: string,
  updates: {
    configuration?: Record<string, any>;
    settings?: Record<string, any>;
    is_active?: boolean;
  }
): Promise<CompanyApplication> {
  try {
    const { data, error } = await supabase
      .from('company_applications')
      .update(updates)
      .eq('company_id', companyId)
      .eq('application_id', applicationId)
      .select(`
        *,
        application:applications(*)
      `)
      .single();

    if (error) {
      console.error('Error updating application settings:', error);
      throw new Error('Failed to update application settings');
    }

    return data;
  } catch (error) {
    console.error('updateApplicationSettings error:', error);
    throw error;
  }
}

/**
 * Check if an application is installed for a company
 */
export async function isApplicationInstalled(
  companyId: string,
  applicationId: string
): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('company_applications')
      .select('id')
      .eq('company_id', companyId)
      .eq('application_id', applicationId)
      .eq('is_active', true)
      .single();

    if (error && error instanceof Error && error.code !== 'PGRST116') {
      console.error('Error checking application installation:', error);
      throw new Error('Failed to check application installation');
    }

    return !!data;
  } catch (error) {
    console.error('isApplicationInstalled error:', error);
    throw error;
  }
}

/**
 * Get application usage statistics for a company
 */
export async function getApplicationUsageStats(companyId: string): Promise<{
  totalInstalled: number;
  totalActive: number;
  byCategory: Record<string, number>;
}> {
  try {
    const { data, error } = await supabase
      .from('company_applications')
      .select(`
        is_active,
        application:applications(category_id)
      `)
      .eq('company_id', companyId);

    if (error) {
      console.error('Error fetching application usage stats:', error);
      throw new Error('Failed to fetch application usage stats');
    }

    const stats = {
      totalInstalled: data?.length || 0,
      totalActive: data?.filter(app => app.is_active).length || 0,
      byCategory: {} as Record<string, number>
    };

    // Count by category
    data?.forEach(app => {
      const category = (app.application as any)?.category_id || 'other';
      stats.byCategory[category] = (stats.byCategory[category] || 0) + 1;
    });

    return stats;
  } catch (error) {
    console.error('getApplicationUsageStats error:', error);
    throw error;
  }
}