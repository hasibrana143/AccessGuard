import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getToken } from 'next-auth/jwt';
import { requireVerifiedEmail } from '@/lib/rbac';
import { logger } from '@/lib/error-logger';

const secret = process.env.NEXTAUTH_SECRET || process.env.JWT_SECRET;

export async function POST(request: NextRequest) {
  const token = await getToken({ req: request, secret });
  if (!token || !token.sub) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const verified = await requireVerifiedEmail(request);
  if (verified instanceof NextResponse) return verified;

  try {
    const body = await request.json();
    const { confirmation } = body;

    if (confirmation !== 'DELETE MY ACCOUNT') {
      return NextResponse.json(
        { success: false, error: 'Please type DELETE MY ACCOUNT to confirm' },
        { status: 400 }
      );
    }

    const userId = token.sub;

    const user = await db.user.findUnique({ where: { id: userId }, include: { organization: true } });
    if (!user) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    await db.$transaction(async (tx) => {
      const remainingUsers = await tx.user.count({ where: { orgId: user.orgId, id: { not: userId } } });

      const projectIds = (await tx.project.findMany({ where: { orgId: user.orgId }, select: { id: true } })).map((p) => p.id);

      if (projectIds.length > 0) {
        await tx.complianceReport.deleteMany({ where: { projectId: { in: projectIds } } });
        await tx.scheduledScan.deleteMany({ where: { projectId: { in: projectIds } } });
        await tx.violation.deleteMany({ where: { projectId: { in: projectIds } } });
        await tx.scan.deleteMany({ where: { projectId: { in: projectIds } } });
      }

      await tx.project.deleteMany({ where: { orgId: user.orgId } });
      await tx.githubConnection.deleteMany({ where: { orgId: user.orgId } });
      await tx.auditLog.deleteMany({ where: { orgId: user.orgId } });
      await tx.teamInvite.deleteMany({ where: { orgId: user.orgId } });
      await tx.passwordReset.deleteMany({ where: { email: user.email } });

      await tx.user.delete({ where: { id: userId } });

      if (remainingUsers === 0) {
        await tx.organization.delete({ where: { id: user.orgId } });
      }
    });

    logger.info({ userId: token.sub }, 'Account deleted successfully');

    return NextResponse.json({ success: true, message: 'Account and all associated data have been deleted' });
  } catch (error) {
    logger.error({ err: error, userId: token.sub }, 'Account deletion failed');
    return NextResponse.json({ success: false, error: 'Failed to delete account' }, { status: 500 });
  }
}
