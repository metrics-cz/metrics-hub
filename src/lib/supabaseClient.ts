import { createBrowserClient } from '@supabase/ssr';

// Environment variable validation
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl) {
  throw new Error('Missing environment variable: NEXT_PUBLIC_SUPABASE_URL');
}

if (!supabaseAnonKey) {
  throw new Error('Missing environment variable: NEXT_PUBLIC_SUPABASE_ANON_KEY');
}

// Browser client for client-side operations (sign-in form, dashboard components, etc.)
// OAuth callback is handled server-side in route.ts, so this client doesn't need PKCE config
export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey);
