import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabaseServer';
import prisma, { safeQuery } from '@/lib/prisma';

// Get user's companies
export async function GET(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();

    // Check authentication
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' }, 
        { status: 401 }
      );
    }

    // Fetch companies using Prisma with safe query execution
    const companiesWithRoles = await safeQuery(
      async () => {
        // Get user's company relationships using Prisma
        const companyUsers = await prisma.company_users.findMany({
          where: {
            user_id: user.id,
          },
          select: {
            company_id: true,
            role: true,
          },
        });

        if (!companyUsers || companyUsers.length === 0) {
          return [];
        }

        // Get company IDs
        const companyIds = companyUsers.map(cu => cu.company_id);

        // Get company details
        const companies = await prisma.companies.findMany({
          where: {
            id: { in: companyIds },
          },
          select: {
            id: true,
            name: true,
            billing_email: true,
            plan: true,
            owner_uid: true,
            created_at: true,
            active: true,
            logo_url: true,
            square_logo_url: true,
            rectangular_logo_url: true,
            primary_color: true,
            secondary_color: true,
            contact_details: true,
            updated_at: true,
          },
        });

        // Combine company data with user roles
        return companies.map(company => {
          const userRole = companyUsers.find(cu => cu.company_id === company.id)?.role;
          return {
            ...company,
            userRole,
          };
        });
      },
      2 // Retry up to 2 times for prepared statement errors
    );

    return NextResponse.json({
      success: true,
      data: companiesWithRoles
    });

  } catch (error) {
    console.error('Companies API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Auth check
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.slice(7);
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const { data: { user }, error: userErr } = await supabase.auth.getUser(token);
    if (userErr || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Get request body
    const { name, description } = await request.json();

    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      return NextResponse.json(
        { error: 'Název firmy musí mít alespoň 2 znaky' },
        { status: 400 }
      );
    }

    // Use Prisma ORM for all environments
    const company = await prisma.companies.create({
      data: {
        name: name.trim(),
        owner_uid: user.id,
        active: true,
      },
    });

    // Create company_user relationship
    await prisma.company_users.create({
      data: {
        company_id: company.id,
        user_id: user.id,
        role: 'owner',
      },
    });

    return NextResponse.json({
      id: company.id,
      name: company.name,
      owner_uid: company.owner_uid,
      active: company.active,
      created_at: company.created_at,
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating company:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : String(error)) : undefined
      },
      { status: 500 }
    );
  }
}