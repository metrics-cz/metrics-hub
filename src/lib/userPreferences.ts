import { supabase } from '@/lib/supabaseClient';

export interface UserPreferences {
  last_selected_company?: string;
}

/**
 * Get user's last selected company ID from their metadata
 */
export function getLastSelectedCompany(user: any): string | null {
  return user?.user_metadata?.last_selected_company || null;
}

/**
 * Update user's last selected company preference
 */
export async function updateLastSelectedCompany(companyId: string): Promise<void> {
  try {
    const { error } = await supabase.auth.updateUser({
      data: { last_selected_company: companyId }
    });
    
    if (error) {
      console.error('Failed to update last selected company:', error);
    }
  } catch (error) {
    console.error('Error updating user preferences:', error);
  }
}

/**
 * Clear user's last selected company preference
 */
export async function clearLastSelectedCompany(): Promise<void> {
  try {
    const { error } = await supabase.auth.updateUser({
      data: { last_selected_company: null }
    });
    
    if (error) {
      console.error('Failed to clear last selected company:', error);
    }
  } catch (error) {
    console.error('Error clearing user preferences:', error);
  }
}