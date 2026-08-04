import { NextRequest, NextResponse } from 'next/server';
import { getAllFlagDefinitions, isEnabled, setFlag } from '@/lib/feature-flags';
import { getToken } from 'next-auth/jwt';
import { logger } from '@/lib/error-logger';

const secret = process.env.NEXTAUTH_SECRET || process.env.JWT_SECRET;

export async function GET(request: NextRequest) {
  const token = await getToken({ req: request, secret });
  if (!token || (token.role !== 'admin' && token.role !== 'owner')) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 });
  }

  const flags = getAllFlagDefinitions();
  const orgId = token.orgId as string | undefined;
  const results = await Promise.all(
    flags.map(async (f) => ({
      key: f.key,
      description: f.description,
      enabled: await isEnabled(f.key, orgId),
      defaultValue: f.defaultValue,
    })),
  );

  return NextResponse.json({ success: true, data: results });
}

export async function POST(request: NextRequest) {
  const token = await getToken({ req: request, secret });
  if (!token || (token.role !== 'admin' && token.role !== 'owner')) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { key, enabled } = body;

    if (!key || typeof enabled !== 'boolean') {
      return NextResponse.json({ success: false, error: 'key and enabled are required' }, { status: 400 });
    }

    const orgId = token.orgId as string | undefined;
    await setFlag(key, enabled, orgId);
    logger.info({ key, enabled, userId: token.sub }, 'Feature flag toggled');

    return NextResponse.json({ success: true, data: { key, enabled } });
  } catch (error) {
    logger.error({ err: error }, 'Error toggling feature flag');
    return NextResponse.json({ success: false, error: 'Failed to toggle flag' }, { status: 500 });
  }
}
