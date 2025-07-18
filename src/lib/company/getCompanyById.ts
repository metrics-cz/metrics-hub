// lib/company/getCompanyById.ts
import { Company } from '@/lib/validation/companySchema';
import { supabase } from '../supabaseClient';

export class CompanyError extends Error {
  constructor(
    message: string,
    public code: 'NOT_FOUND' | 'ACCESS_DENIED' | 'UNAUTHORIZED' | 'NETWORK_ERROR' | 'UNKNOWN',
    public status?: number
  ) {
    super(message);
    this.name = 'CompanyError';
  }
}

export async function getCompanyById(companyId: string): Promise<Company> {
  try {
    // Get the auth token from Supabase session
    const {
      data: { session },
      error: sessionError
    } = await supabase.auth.getSession();

    if (sessionError) {
      console.error('Session error:', sessionError);
      throw new CompanyError('Authentication error', 'UNAUTHORIZED', 401);
    }

    const token = session?.access_token;
    if (!token) {
      throw new CompanyError('Authentication required', 'UNAUTHORIZED', 401);
    }

    // Make API request
    const response = await fetch(`/api/company/${companyId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    // Handle empty response or invalid JSON
    let data;
    try {
      const responseText = await response.text();
      if (!responseText) {
        throw new CompanyError(
          'Empty response from server',
          'NETWORK_ERROR',
          response.status
        );
      }
      data = JSON.parse(responseText);
    } catch (jsonError) {
      if (jsonError instanceof CompanyError) {
        throw jsonError;
      }
      throw new CompanyError(
        'Invalid response format from server',
        'NETWORK_ERROR',
        response.status
      );
    }

    // Handle different HTTP status codes
    if (!response.ok) {
      switch (response.status) {
        case 400:
          throw new CompanyError(
            data.error || 'Invalid company ID format',
            'NOT_FOUND',
            400
          );
        case 404:
          throw new CompanyError(
            'Company not found',
            'NOT_FOUND',
            404
          );
        case 403:
          throw new CompanyError(
            'You do not have access to this company',
            'ACCESS_DENIED',
            403
          );
        case 401:
          throw new CompanyError(
            'Authentication required',
            'UNAUTHORIZED',
            401
          );
        case 500:
          throw new CompanyError(
            'Server error occurred',
            'UNKNOWN',
            500
          );
        default:
          throw new CompanyError(
            data.error || `Request failed with status ${response.status}`,
            'NETWORK_ERROR',
            response.status
          );
      }
    }

    return data as Company;

  } catch (error) {
    // Re-throw CompanyError instances
    if (error instanceof CompanyError) {
      throw error;
    }

    // Handle network/fetch errors
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new CompanyError(
        'Network error - please check your connection',
        'NETWORK_ERROR'
      );
    }

    // Handle Supabase auth errors
    if ((error instanceof Error && error.message.includes('auth')) || (error instanceof Error && error.message.includes('session'))) {
      throw new CompanyError(
        'Authentication error - please log in again',
        'UNAUTHORIZED',
        401
      );
    }

    // Handle other unknown errors
    throw new CompanyError(
      error instanceof Error ? error.message : 'Unknown error occurred',
      'UNKNOWN'
    );
  }
}