import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getStripeClient } from '@/lib/stripe';
import { logger } from '@/lib/error-logger';

const DEMO_INVOICES = [
  { id: 'inv_demo_001', number: 'AG-2026-0001', amount: 14900, status: 'paid', createdAt: '2026-07-01T10:00:00.000Z', url: null },
  { id: 'inv_demo_002', number: 'AG-2026-0002', amount: 14900, status: 'paid', createdAt: '2026-06-01T10:00:00.000Z', url: null },
  { id: 'inv_demo_003', number: 'AG-2026-0003', amount: 14900, status: 'paid', createdAt: '2026-05-01T10:00:00.000Z', url: null },
  { id: 'inv_demo_004', number: 'AG-2026-0004', amount: 14900, status: 'open', createdAt: '2026-08-01T10:00:00.000Z', url: null },
];

// GET /api/stripe/invoices - List invoices for the organization
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
    let invoices: Array<{ id: string; number: string; amount: number; status: string; createdAt: string; url: string | null }> = [];

    if (stripe && org?.stripeCustomerId) {
      try {
        const result = await stripe.invoices.list({ customer: org.stripeCustomerId, limit: 12 });
        invoices = result.data.map((inv) => ({
          id: inv.id,
          number: inv.number || inv.id,
          amount: inv.amount_due,
          status: inv.status || 'unknown',
          createdAt: new Date(inv.created * 1000).toISOString(),
          url: inv.hosted_invoice_url || null,
        }));
      } catch (error) {
        logger.error({ err: error }, '');
        invoices = DEMO_INVOICES;
      }
    } else {
      invoices = DEMO_INVOICES;
    }

    return NextResponse.json({ success: true, data: invoices, demo: !stripe || !org?.stripeCustomerId });
  } catch (error) {
    logger.error({ err: error }, '');
    return NextResponse.json({ success: false, error: 'Failed to fetch invoices' }, { status: 500 });
  }
}
