import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabaseServer';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: categories, error } = await supabase
      .from('application_categories')
      .select('*')
      .order('sort_order', { ascending: true });

    if (error) {
      console.error('Error fetching application categories:', error);
      return NextResponse.json(
        { error: 'Failed to fetch categories' }, 
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: categories || []
    });

  } catch (error) {
    console.error('Application categories API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    );
  }
}