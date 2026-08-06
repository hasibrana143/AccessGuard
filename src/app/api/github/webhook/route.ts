import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { logger } from '@/lib/error-logger';
import { verifyWebhookSignature } from '@/lib/github-webhook';

// GitHub App installation webhook (docs/engineering/GITHUB_INTEGRATION.md §5).
// Ingests `installation` + `installation_repositories` events and keeps
// GithubConnection in sync. Resolves the owning org through the connecting
// user's githubLogin (set during /api/github/callback).
export async function POST(request: NextRequest) {
  const secret = process.env.GITHUB_APP_WEBHOOK_SECRET;
  if (!secret) {
    logger.warn('GitHub App webhook received but GITHUB_APP_WEBHOOK_SECRET is not set');
    return NextResponse.json(
      { success: false, error: 'Webhook not configured' },
      { status: 503 }
    );
  }

  const rawBody = await request.text();
  const signature = request.headers.get('x-hub-signature-256');
  if (!verifyWebhookSignature(rawBody, signature, secret)) {
    logger.warn('GitHub webhook signature verification failed');
    return NextResponse.json(
      { success: false, error: 'Invalid signature' },
      { status: 401 }
    );
  }

  const event = request.headers.get('x-github-event') || 'unknown';
  let payload: Record<string, any>;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json(
      { success: false, error: 'Invalid JSON body' },
      { status: 400 }
    );
  }

  if (event === 'ping') {
    return NextResponse.json({ success: true, event });
  }

  try {
    if (event === 'installation') {
      await handleInstallation(payload);
    } else if (event === 'installation_repositories') {
      await handleInstallationRepositories(payload);
    } else {
      // Unknown events are acknowledged and ignored (GitHub retries non-2xx).
      logger.info({ event }, 'Ignoring unhandled GitHub webhook event');
    }
  } catch (err) {
    logger.error({ err, event }, 'GitHub webhook processing failed');
    return NextResponse.json(
      { success: false, error: 'Processing failed' },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true, event });
}

async function resolveOrgId(login: string | undefined): Promise<string | null> {
  if (!login) return null;
  const user = await db.user.findFirst({ where: { githubLogin: login } });
  return user?.orgId ?? null;
}

async function handleInstallation(payload: Record<string, any>): Promise<void> {
  const action: string = payload.action ?? 'created';
  const installationId = String(payload.installation?.id ?? '');
  const accountLogin: string | undefined = payload.installation?.account?.login;
  const login: string | undefined = payload.sender?.login ?? accountLogin;
  const repositories: string[] = (payload.repositories ?? []).map(
    (r: { full_name?: string }) => r.full_name ?? ''
  ).filter(Boolean);

  if (!installationId) {
    logger.warn('Installation event without installation id');
    return;
  }

  const isActive = action !== 'deleted' && action !== 'suspended';

  const existing = await db.githubConnection.findUnique({
    where: { installationId },
  });

  if (existing) {
    await db.githubConnection.update({
      where: { id: existing.id },
      data: { isActive, repositories: JSON.stringify(repositories) },
    });
    await createAudit(existing.orgId, action, installationId, login);
    return;
  }

  const orgId = await resolveOrgId(login);
  if (!orgId) {
    logger.warn(
      { login, action },
      'GitHub installation event for unknown user — dropped (no org mapping)'
    );
    return;
  }

  await db.githubConnection.create({
    data: { orgId, installationId, repositories: JSON.stringify(repositories), isActive },
  });
  await createAudit(orgId, action, installationId, login);
}

async function handleInstallationRepositories(payload: Record<string, any>): Promise<void> {
  const action: string = payload.action ?? 'added';
  const installationId = String(payload.installation?.id ?? '');
  if (!installationId) return;

  const existing = await db.githubConnection.findUnique({
    where: { installationId },
  });
  if (!existing) {
    logger.warn({ installationId }, 'Repo event for unknown installation');
    return;
  }

  const current: string[] = JSON.parse(existing.repositories || '[]');
  const added: string[] = (payload.repositories_added ?? []).map(
    (r: { full_name?: string }) => r.full_name ?? ''
  ).filter(Boolean);
  const removed: string[] = (payload.repositories_removed ?? []).map(
    (r: { full_name?: string }) => r.full_name ?? ''
  ).filter(Boolean);

  let next = current;
  if (action === 'removed') {
    next = current.filter((name) => !removed.includes(name));
  } else {
    next = [...new Set([...current, ...added])];
  }

  await db.githubConnection.update({
    where: { id: existing.id },
    data: { repositories: JSON.stringify(next) },
  });
  await createAudit(existing.orgId, `repositories_${action}`, installationId);
}

async function createAudit(
  orgId: string,
  action: string,
  installationId: string,
  login?: string
): Promise<void> {
  try {
    await db.auditLog.create({
      data: {
        orgId,
        action: 'github.connection_sync',
        metadata: JSON.stringify({
          eventAction: action,
          installationId,
          username: login,
          timestamp: new Date().toISOString(),
        }),
      },
    });
  } catch (err) {
    logger.error({ err }, 'Audit log write failed for GitHub webhook');
  }
}
