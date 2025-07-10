import { supabase } from '@/lib/supabaseClient';
import { requestCache } from '@/lib/requestCache';

export interface CachedApiResponse<T> {
  data?: T;
  error?: string;
  success: boolean;
}

class CachedApi {
  private async getAuthHeaders(): Promise<Record<string, string>> {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error || !session?.access_token) {
        throw new Error('No authentication token available');
      }
      
      return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      };
    } catch (error) {
      console.error('Error getting auth headers:', error);
      throw new Error('Authentication failed');
    }
  }

  async fetchCompany(companyId: string): Promise<any> {
    const cacheKey = `company:${companyId}`;
    
    return requestCache.get(cacheKey, async () => {
      try {
        const headers = await this.getAuthHeaders();
        const response = await fetch(`/api/company/${companyId}`, { headers });
        
        if (!response.ok) {
          const errorText = await response.text().catch(() => 'Unknown error');
          throw new Error(`Failed to fetch company (${response.status}): ${errorText}`);
        }
        
        const data = await response.json();
        return data; // Return the full response which contains userRole, etc.
      } catch (error) {
        console.error('Error fetching company:', error);
        throw error;
      }
    });
  }

  async fetchCompanyUsers(companyId: string): Promise<any[]> {
    const cacheKey = `company-users:${companyId}`;
    
    return requestCache.get(cacheKey, async () => {
      try {
        const headers = await this.getAuthHeaders();
        const response = await fetch(`/api/company/${companyId}/users/mini`, { headers });
        
        if (!response.ok) {
          const errorText = await response.text().catch(() => 'Unknown error');
          throw new Error(`Failed to fetch company users (${response.status}): ${errorText}`);
        }
        
        const data = await response.json();
        return data; // Return the users array directly
      } catch (error) {
        console.error('Error fetching company users:', error);
        throw error;
      }
    });
  }

  async fetchNotifications(): Promise<{ data?: { notifications: any[] }, success: boolean }> {
    const cacheKey = 'notifications';
    
    return requestCache.get(cacheKey, async () => {
      try {
        const headers = await this.getAuthHeaders();
        const response = await fetch('/api/notifications', { headers });
        
        if (!response.ok) {
          const errorText = await response.text().catch(() => 'Unknown error');
          throw new Error(`Failed to fetch notifications (${response.status}): ${errorText}`);
        }
        
        const data = await response.json();
        return data; // Return the full API response which has .data.notifications structure
      } catch (error) {
        console.error('Error fetching notifications:', error);
        throw error;
      }
    });
  }

  // Invalidate cache methods
  invalidateCompany(companyId: string): void {
    requestCache.invalidate(`company:${companyId}`);
  }

  invalidateCompanyUsers(companyId: string): void {
    requestCache.invalidate(`company-users:${companyId}`);
  }

  invalidateNotifications(): void {
    requestCache.invalidate('notifications');
  }

  clearAll(): void {
    requestCache.clear();
  }

  // Application management methods
  async installApplication(companyId: string, applicationId: string): Promise<any> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`/api/company/${companyId}/applications`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ applicationId })
      });
      
      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        throw new Error(`Failed to install application (${response.status}): ${errorText}`);
      }
      
      const data = await response.json();
      
      // Invalidate related caches
      this.invalidateCompanyApplications(companyId);
      
      return data;
    } catch (error) {
      console.error('Error installing application:', error);
      throw error;
    }
  }

  async fetchCompanyApplications(companyId: string): Promise<any[]> {
    const cacheKey = `company-applications:${companyId}`;
    
    return requestCache.get(cacheKey, async () => {
      try {
        const headers = await this.getAuthHeaders();
        const response = await fetch(`/api/company/${companyId}/applications`, { headers });
        
        if (!response.ok) {
          const errorText = await response.text().catch(() => 'Unknown error');
          throw new Error(`Failed to fetch company applications (${response.status}): ${errorText}`);
        }
        
        const data = await response.json();
        return data.success ? data.data : [];
      } catch (error) {
        console.error('Error fetching company applications:', error);
        throw error;
      }
    });
  }

  async uninstallApplication(companyId: string, applicationId: string): Promise<any> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`/api/company/${companyId}/applications/${applicationId}`, {
        method: 'DELETE',
        headers
      });
      
      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        throw new Error(`Failed to uninstall application (${response.status}): ${errorText}`);
      }
      
      const data = await response.json();
      
      // Invalidate related caches
      this.invalidateCompanyApplications(companyId);
      
      return data;
    } catch (error) {
      console.error('Error uninstalling application:', error);
      throw error;
    }
  }

  async updateApplicationSettings(companyId: string, applicationId: string, settings: any): Promise<any> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`/api/company/${companyId}/applications/${applicationId}/settings`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ settings })
      });
      
      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        throw new Error(`Failed to update application settings (${response.status}): ${errorText}`);
      }
      
      const data = await response.json();
      
      // Invalidate related caches
      this.invalidateCompanyApplications(companyId);
      
      return data;
    } catch (error) {
      console.error('Error updating application settings:', error);
      throw error;
    }
  }

  // Cache invalidation methods for applications
  invalidateCompanyApplications(companyId: string): void {
    requestCache.invalidate(`company-applications:${companyId}`);
  }
}

export const cachedApi = new CachedApi();