import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireVerifiedEmail } from '@/lib/rbac';
import { PERMISSIONS } from '@/lib/permissions';
import { createCustomer } from '@/lib/stripe';
import { logger } from '@/lib/error-logger';

// POST /api/stripe/create-customer - Create a Stripe customer and link to organization
export async function POST(request: NextRequest) {
  try {
    const verified = await requireVerifiedEmail(request, { permission: PERMISSIONS.MANAGE_BILLING });
    if (verified instanceof NextResponse) return verified;

    // Get user and organization
    const user = await db.user.findUnique({
      where: { id: verified.user.id },
      include: {
        organization: true,
      },
    });

    if (!user || !user.organization) {
      return NextResponse.json(
        { success: false, error: 'User or organization not found' },
        { status: 404 }
      );
    }

    // Check if user is admin or owner
    if (user.role !== 'admin' && user.role !== 'owner') {
      return NextResponse.json(
        { success: false, error: 'Only admins can create billing accounts' },
        { status: 403 }
      );
    }

    // Check if organization already has a Stripe customer
    if (user.organization.stripeCustomerId) {
      return NextResponse.json({
        success: true,
        data: {
          customerId: user.organization.stripeCustomerId,
          message: 'Customer already exists',
        },
      });
    }

    // Parse request body for additional metadata
    let body = {};
    try {
      body = await request.json();
    } catch {
      // Body is optional
    }

    const { email, name } = body as { email?: string; name?: string };

    // Create Stripe customer
    const customer = await createCustomer(
      email ?? user.email,
      name ?? user.organization.name ?? undefined
    );

    if (!customer) {
      return NextResponse.json(
        { success: false, error: 'Failed to create customer' },
        { status: 500 }
      );
    }

    // Update organization with Stripe customer ID
    await db.organization.update({
      where: { id: user.orgId },
      data: {
        stripeCustomerId: customer.id,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        customerId: customer.id,
        email: customer.email,
        name: customer.name,
      },
    });
  } catch (error) {
    logger.error({ err: error }, '');
    return NextResponse.json(
      { success: false, error: 'Failed to create customer' },
      { status: 500 }
    );
  }
}
