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
}

export const cachedApi = new CachedApi();