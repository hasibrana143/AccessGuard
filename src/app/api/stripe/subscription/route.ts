import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireVerifiedEmail } from '@/lib/rbac';
import { PERMISSIONS } from '@/lib/permissions';
import { PRICING_PLANS, type PlanType, type SubscriptionStatus } from '@/lib/stripe';

// GET /api/stripe/subscription - Get subscription status
export async function GET() {
  try {
    const demoOrg = await db.organization.findFirst({
      where: { slug: 'demo-org' },
      include: { _count: { select: { projects: true } } }
    });

    if (!demoOrg) {
      return NextResponse.json({
        success: true,
        data: {
          subscription: null,
          plan: 'starter',
          usage: { websites: 0, websitesLimit: 1, pagesScanned: 0, pagesLimit: 100 },
          isDemo: true,
        }
      });
    }

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const scansThisMonth = await db.scan.aggregate({
      where: { project: { orgId: demoOrg.id }, createdAt: { gte: startOfMonth } },
      _sum: { pagesScanned: true }
    });

    const plan = (demoOrg.plan || 'starter') as PlanType;
    const planLimits = PRICING_PLANS.find(p => p.id === plan)?.limits || { websites: 1, pagesPerMonth: 100 };

    return NextResponse.json({
      success: true,
      data: {
        subscription: demoOrg.stripeSubscriptionId ? {
          id: demoOrg.id,
          status: demoOrg.subscriptionStatus || 'active',
          plan,
          currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        } : null,
        plan,
        usage: {
          websites: demoOrg._count.projects,
          websitesLimit: planLimits.websites === -1 ? 999 : planLimits.websites,
          pagesScanned: scansThisMonth._sum.pagesScanned || 0,
          pagesLimit: planLimits.pagesPerMonth === -1 ? 99999 : planLimits.pagesPerMonth,
        },
        isDemo: !process.env.STRIPE_SECRET_KEY,
      }
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to fetch subscription' }, { status: 500 });
  }
}

// POST /api/stripe/subscription - Create subscription (demo)
export async function POST(request: NextRequest) {
  try {
    const verified = await requireVerifiedEmail(request, { permission: PERMISSIONS.MANAGE_BILLING });
    if (verified instanceof NextResponse) return verified;

    const { priceId } = await request.json();
    let plan: PlanType = 'starter';
    if (priceId?.includes('agency')) plan = 'agency';
    else if (priceId?.includes('enterprise')) plan = 'enterprise';

    await db.organization.update({
      where: { slug: 'demo-org' },
      data: { plan, subscriptionStatus: 'active' }
    });

    return NextResponse.json({
      success: true,
      data: { status: 'active', plan }
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to create subscription' }, { status: 500 });
  }
}

// DELETE /api/stripe/subscription - Cancel subscription (demo)
export async function DELETE(request: NextRequest) {
  try {
    const verified = await requireVerifiedEmail(request, { permission: PERMISSIONS.MANAGE_BILLING });
    if (verified instanceof NextResponse) return verified;

    await db.organization.update({
      where: { slug: 'demo-org' },
      data: { plan: 'starter', subscriptionStatus: 'canceled' }
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to cancel' }, { status: 500 });
  }
}
