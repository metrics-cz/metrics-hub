// src/app/api/company/[companyId]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import prisma from '@/lib/prisma';

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
    // Use Prisma ORM for all environments
    const [company, membership] = await Promise.all([
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
        message: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : String(error)) : undefined
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
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

    /* 3 ───────────────────────────────── Check if company exists and user is owner */
    // Use Prisma ORM for all environments
    const [company, membership] = await Promise.all([
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

    // Only owners can delete companies
    if (membership.role !== 'owner') {
      return NextResponse.json({ 
        error: 'Only company owners can delete companies',
        code: 'INSUFFICIENT_PERMISSIONS' 
      }, { status: 403 });
    }

    /* 4 ───────────────────────────────── Delete company with cascading operations */
    // Use Prisma transaction for all environments
    await prisma.$transaction(async (tx) => {
      // Delete all company invitations
      await tx.company_invitations.deleteMany({
        where: { companyId: companyId }
      });
      
      // Delete all company users
      await tx.company_users.deleteMany({
        where: { company_id: companyId }
      });
      
      // Delete the company
      await tx.companies.delete({
        where: { id: companyId }
      });
    });

    return NextResponse.json({ 
      success: true,
      message: 'Company deleted successfully' 
    });

  } catch (error) {
    console.error('Unexpected error in company delete route:', error);
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        code: 'INTERNAL_ERROR',
        message: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : String(error)) : undefined
      },
      { status: 500 }
    );
  }
}

export async function PUT(
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

    /* 3 ───────────────────────────────── Parse and validate request body */
    let updateData;
    try {
      updateData = await request.json();
    } catch (error) {
      return NextResponse.json({ 
        error: 'Invalid JSON in request body',
        code: 'INVALID_JSON' 
      }, { status: 400 });
    }

    // Validate allowed fields for update
    const allowedFields = ['name', 'description'];
    const updateFields: any = {};

    for (const field of allowedFields) {
      if (updateData[field] !== undefined) {
        updateFields[field] = updateData[field];
      }
    }

    // Validate company name if provided
    if (updateFields.name !== undefined) {
      if (typeof updateFields.name !== 'string' || updateFields.name.trim().length === 0) {
        return NextResponse.json({ 
          error: 'Company name must be a non-empty string',
          code: 'INVALID_NAME' 
        }, { status: 400 });
      }
      if (updateFields.name.trim().length > 100) {
        return NextResponse.json({ 
          error: 'Company name must be less than 100 characters',
          code: 'NAME_TOO_LONG' 
        }, { status: 400 });
      }
      updateFields.name = updateFields.name.trim();
    }

    // Validate description if provided
    if (updateFields.description !== undefined) {
      if (typeof updateFields.description !== 'string') {
        return NextResponse.json({ 
          error: 'Description must be a string',
          code: 'INVALID_DESCRIPTION' 
        }, { status: 400 });
      }
      if (updateFields.description.length > 1000) {
        return NextResponse.json({ 
          error: 'Description must be less than 1000 characters',
          code: 'DESCRIPTION_TOO_LONG' 
        }, { status: 400 });
      }
    }

    if (Object.keys(updateFields).length === 0) {
      return NextResponse.json({ 
        error: 'No valid fields provided for update',
        code: 'NO_UPDATE_FIELDS' 
      }, { status: 400 });
    }

    /* 4 ───────────────────────────────── Check company access and permissions */
    // Use Prisma ORM for all environments
    const membership = await prisma.company_users.findFirst({
      where: {
        company_id: companyId,
        user_id: uid,
      },
      select: { id: true, role: true },
    });

    if (!membership) {
      return NextResponse.json({ 
        error: 'No access to this company',
        code: 'ACCESS_DENIED' 
      }, { status: 403 });
    }

    // Only admins, owners, and superadmins can update company details
    if (!['admin', 'owner', 'superadmin'].includes(membership.role)) {
      return NextResponse.json({ 
        error: 'Insufficient permissions to update company details',
        code: 'INSUFFICIENT_PERMISSIONS' 
      }, { status: 403 });
    }

    /* 5 ───────────────────────────────── Update company */
    // Use Prisma ORM for all environments
    const updatedCompany = await prisma.companies.update({
      where: { id: companyId },
      data: {
        ...updateFields,
        updated_at: new Date(),
      },
    });

    if (!updatedCompany) {
      return NextResponse.json({ 
        error: 'Company not found',
        code: 'COMPANY_NOT_FOUND' 
      }, { status: 404 });
    }

    /* 6 ───────────────────────────────── Return updated company data */
    return NextResponse.json({
      ...updatedCompany,
      userRole: membership.role
    });

  } catch (error) {
    console.error('Unexpected error in company update route:', error);
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        code: 'INTERNAL_ERROR',
        message: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : String(error)) : undefined
      },
      { status: 500 }
    );
  }
}