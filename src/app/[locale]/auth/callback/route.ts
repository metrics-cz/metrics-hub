import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest, { params }: { params: Promise<{ locale: string }> }) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const { locale } = await params;

  // No code provided - redirect back to auth page
  if (!code) {
    return NextResponse.redirect(new URL(`/${locale}/auth`, request.url));
  }

  try {
    const cookieStore = await cookies();

    // Create server client with access to cookies (where PKCE code_verifier is stored)
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          // Read cookie value
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
          // Write cookie value
          set(name: string, value: string, options: any) {
            cookieStore.set(name, value, options);
          },
          // Delete cookie
          remove(name: string, options: any) {
            cookieStore.set(name, '', { ...options, maxAge: 0 });
          },
        },
      }
    );

    // Exchange OAuth code for session (code_verifier automatically retrieved from cookies)
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      console.error('[OAuth Callback] Code exchange error:', error);
      return NextResponse.redirect(new URL(`/${locale}/auth`, request.url));
    }

    // Success - redirect to companies page
    return NextResponse.redirect(new URL(`/${locale}/companies`, request.url));
  } catch (error) {
    console.error('[OAuth Callback] Unexpected error:', error);
    return NextResponse.redirect(new URL(`/${locale}/auth`, request.url));
  }
}
