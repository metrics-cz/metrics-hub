import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabaseServer';

// Get all available automations
export async function GET(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();

    const { data: automations, error } = await supabase
      .from('automations')
      .select('*')
      .eq('is_active', true)
      .order('name');

    if (error) {
      console.error('Error fetching automations:', error);
      return NextResponse.json(
        { error: 'Failed to fetch automations', details: (error instanceof Error ? error.message : String(error)) }, 
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: automations || []
    });

  } catch (error) {
    console.error('Automations API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    );
  }
}