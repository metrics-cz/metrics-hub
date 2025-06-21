// src/app/api/company/[companyId]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import prisma from '@/lib/prisma';
import { queryDb } from '@/lib/db';

type RouteContext = { params: Promise<{ companyId: string }> };

// UUID validation helper
function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

export async function GET(
  request: NextRequest,
  { params }: RouteContext
) {
  try {
    /* 1 ───────────────────────────────── Auth: verify bearer token */
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

    const uid = user.id;

    /* 2 ───────────────────────────────── Validate and get company ID */
    const { companyId } = await params;
    
    // Validate UUID format
    if (!isValidUUID(companyId)) {
      return NextResponse.json({ 
        error: 'Invalid company ID format',
        code: 'INVALID_COMPANY_ID' 
      }, { status: 400 });
    }

    /* 3 ───────────────────────────────── Check if company exists and user membership */
    let company, membership;
    
    if (process.env.NODE_ENV === 'development') {
      // Use native PostgreSQL client for development
      const companyQuery = `
        SELECT * FROM companies WHERE id = $1
      `;
      
      const membershipQuery = `
        SELECT id, role FROM company_users 
        WHERE company_id = $1 AND user_id = $2
      `;
      
      const [companyResults, membershipResults] = await Promise.all([
        queryDb(companyQuery, [companyId]),
        queryDb(membershipQuery, [companyId, uid])
      ]);
      
      company = companyResults[0];
      membership = membershipResults[0];
    } else {
      // Use Prisma ORM in production
      [company, membership] = await Promise.all([
        prisma.companies.findUnique({
          where: { id: companyId },
        }),
        prisma.company_users.findFirst({
          where: {
            company_id: companyId,
            user_id: uid,
          },
          select: { id: true, role: true },
        })
      ]);
    }

    if (!company) {
      return NextResponse.json({ 
        error: 'Company not found',
        code: 'COMPANY_NOT_FOUND' 
      }, { status: 404 });
    }

    if (!membership) {
      return NextResponse.json({ 
        error: 'No access to this company',
        code: 'ACCESS_DENIED' 
      }, { status: 403 });
    }

    /* 4 ───────────────────────────────── Return company data */
    return NextResponse.json({
      ...company,
      userRole: membership.role // Include user's role in the company
    });


  } catch (error) {
    console.error('Unexpected error in company route:', error);
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        code: 'INTERNAL_ERROR',
        message: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}