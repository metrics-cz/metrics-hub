import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabaseServer';
import { withAuth, AuthContext } from '@/lib/auth-middleware';

async function handler(request: NextRequest, context: AuthContext) {
  try {
    console.log('Applications handler started with user:', context.user.id);
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const search = searchParams.get('search');
    const limit = searchParams.get('limit') || '50';
    const offset = searchParams.get('offset') || '0';

    console.log('Creating Supabase client...');
    const supabase = await createSupabaseServerClient();
    console.log('Supabase client created successfully');
    
    let query = supabase
      .from('applications')
      .select(`
        *,
        category_info:application_categories(name, description, icon)
      `)
      .eq('is_active', true)
      .order('rating', { ascending: false })
      .order('download_count', { ascending: false })
      .limit(parseInt(limit))
      .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

    // Filter by category if provided
    if (category && category !== 'all') {
      query = query.eq('category_id', category);
    }

    // Search functionality - sanitize input to prevent SQL injection
    if (search) {
      // Sanitize search input by removing special characters that could be used for injection
      const sanitizedSearch = search
        .replace(/[%_]/g, '\\$&') // Escape LIKE wildcards
        .replace(/['"\\]/g, '') // Remove quotes and backslashes
        .replace(/[;]/g, '') // Remove semicolons
        .trim();
      
      if (sanitizedSearch.length > 0) {
        query = query.or(`name.ilike.%${sanitizedSearch}%,description.ilike.%${sanitizedSearch}%`);
      }
    }

    console.log('Executing applications query...');
    const { data: applications, error } = await query;
    console.log('Query result:', { hasData: !!applications, dataLength: applications?.length, error: error?.message });

    if (error) {
      console.error('Error fetching applications:', error);
      return NextResponse.json(
        { error: 'Failed to fetch applications', details: error?.message || JSON.stringify(error) }, 
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        applications: applications || [],
        pagination: {
          limit: parseInt(limit),
          offset: parseInt(offset),
          total: applications?.length || 0
        }
      }
    });

  } catch (error) {
    console.error('Applications API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    );
  }
}

// Export the authenticated handler
export const GET = withAuth(handler);