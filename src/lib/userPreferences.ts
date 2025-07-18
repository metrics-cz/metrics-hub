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
    // Verify user authentication securely
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      console.warn('Cannot update last selected company: no authenticated user');
      return;
    }

    const { error } = await supabase.auth.updateUser({
      data: { last_selected_company: companyId }
    });
    
    if (error) {
      console.error('Failed to update last selected company:', error);
      // Don't throw on auth errors to prevent app crashes
      if (error instanceof Error && (error.message.includes('AuthApiError') || error.message.includes('JWT'))) {
        console.warn('Authentication error while updating preferences, ignoring');
        return;
      }
      throw error; // Only throw for non-auth errors
    }
  } catch (error) {
    console.error('Error updating user preferences:', error);
    // Handle AuthApiError specifically to prevent crashes
    if (error instanceof Error && (error.message.includes('AuthApiError') || error.message.includes('JWT'))) {
      console.warn('Authentication error caught, not throwing to prevent crash');
      return;
    }
    throw error; // Re-throw only non-auth errors
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