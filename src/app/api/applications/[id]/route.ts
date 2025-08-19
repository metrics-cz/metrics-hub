import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const { data: application, error } = await supabase
      .from('applications')
      .select(`
        *,
        category_info:application_categories(name, description, icon),
        permissions:application_permissions(*)
      `)
      .eq('id', id)
      .eq('is_active', true)
      .single();

    if (error) {
      console.error('Error fetching application:', error);
      if (error instanceof Error && error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Application not found' }, 
          { status: 404 }
        );
      }
      return NextResponse.json(
        { error: 'Failed to fetch application' }, 
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: application
    });

  } catch (error) {
    console.error('Application detail API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    );
  }
}