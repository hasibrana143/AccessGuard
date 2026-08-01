import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { sendWebhookNotification } from '@/lib/notifications';
import { requireOrgAccess } from '@/lib/rbac';
import { logger } from '@/lib/error-logger';

// POST /api/notifications/test - Send a test webhook message
export async function POST(request: NextRequest) {
  try {
    const { orgId } = await request.json();

    if (!orgId) {
      return NextResponse.json(
        { success: false, error: 'Organization ID is required' },
        { status: 400 }
      );
    }

    const access = await requireOrgAccess(request, orgId);
    if (access instanceof NextResponse) return access;

    const org = await db.organization.findUnique({
      where: { id: access.org.id },
      select: { settings: true, name: true },
    });

    if (!org) {
      return NextResponse.json(
        { success: false, error: 'Organization not found' },
        { status: 404 }
      );
    }

    const settings = org.settings ? JSON.parse(org.settings) : {};
    const webhookUrl: string | undefined = settings.slackWebhookUrl;

    if (!webhookUrl) {
      return NextResponse.json(
        { success: false, error: 'No webhook configured. Save a webhook URL first.' },
        { status: 400 }
      );
    }

    const result = await sendWebhookNotification(webhookUrl, {
      title: 'AccessGuard Test Notification',
      text: `This is a test message from AccessGuard for ${org.name}. Your webhook is working correctly.`,
      color: 'green',
      fields: [
        { label: 'Sent at', value: new Date().toLocaleString() },
        { label: 'Status', value: 'OK' },
      ],
    });

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || 'Failed to send test message' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error({ err: error }, '');
    return NextResponse.json(
      { success: false, error: 'Failed to send test message' },
      { status: 500 }
    );
  }
}
