import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import prisma from '@/lib/prisma';
import { queryDb } from '@/lib/db';

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

    let company, companyUser;

    if (process.env.NODE_ENV === 'development') {
      // Use native PostgreSQL client for development
      const createCompanyQuery = `
        INSERT INTO companies (name, owner_uid, active)
        VALUES ($1, $2, true)
        RETURNING *
      `;

      const createCompanyUserQuery = `
        INSERT INTO company_users (company_id, user_id, role)
        VALUES ($1, $2, 'owner')
        RETURNING *
      `;

      // Create company
      const companyResults = await queryDb(createCompanyQuery, [name.trim(), user.id]);
      company = companyResults[0];

      // Create company_user relationship
      await queryDb(createCompanyUserQuery, [company.id, user.id]);
    } else {
      // Use Prisma ORM in production
      company = await prisma.companies.create({
        data: {
          name: name.trim(),
          owner_uid: user.id,
          active: true,
        },
      });

      // Create company_user relationship
      companyUser = await prisma.company_users.create({
        data: {
          company_id: company.id,
          user_id: user.id,
          role: 'owner',
        },
      });
    }

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
        message: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}