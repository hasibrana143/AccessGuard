import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getStripeClient } from '@/lib/stripe';
import { logger } from '@/lib/error-logger';

// GET /api/stripe/invoices - List invoices for the organization (Stripe only, no demo data)
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const orgId = (session.user as { orgId?: string }).orgId;
    if (!orgId) {
      return NextResponse.json({ success: false, error: 'No organization found' }, { status: 403 });
    }

    const org = await db.organization.findUnique({
      where: { id: orgId },
      select: { stripeCustomerId: true },
    });

    const stripe = getStripeClient();
    if (!stripe) {
      return NextResponse.json({ success: false, error: 'Billing is not configured' }, { status: 503 });
    }
    if (!org?.stripeCustomerId) {
      return NextResponse.json({ success: true, data: [] });
    }

    try {
      const result = await stripe.invoices.list({ customer: org.stripeCustomerId, limit: 12 });
      const invoices = result.data.map((inv) => ({
        id: inv.id,
        number: inv.number || inv.id,
        amount: inv.amount_due,
        status: inv.status || 'unknown',
        createdAt: new Date(inv.created * 1000).toISOString(),
        url: inv.hosted_invoice_url || null,
      }));
      return NextResponse.json({ success: true, data: invoices });
    } catch (error) {
      logger.error({ err: error }, 'Stripe invoices fetch failed');
      return NextResponse.json({ success: false, error: 'Failed to fetch invoices from Stripe' }, { status: 502 });
    }
  } catch (error) {
    logger.error({ err: error }, '');
    return NextResponse.json({ success: false, error: 'Failed to fetch invoices' }, { status: 500 });
  }
}
