import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireVerifiedEmail } from '@/lib/rbac';
import { PERMISSIONS } from '@/lib/permissions';
import { logger } from '@/lib/error-logger';
import { createAuditLog } from '@/lib/audit';

// DELETE /api/v1/apikeys/:id - Revoke API key
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireVerifiedEmail(request);
  if (auth instanceof NextResponse) return auth;

  const user = auth.user;
  const orgId = auth.user.orgId;
  const { id } = await params;

  // Check permission
  const hasPermission = user.customRole
    ? user.customRole.permissions.includes(PERMISSIONS.API_KEYS_WRITE)
    : user.role === 'owner' || user.role === 'admin';

  if (!hasPermission) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
  }

  const apiKey = await db.apiKey.findFirst({
    where: { id, orgId },
  });

  if (!apiKey) {
    return NextResponse.json({ error: 'API key not found' }, { status: 404 });
  }

  if (apiKey.revokedAt) {
    return NextResponse.json({ error: 'API key already revoked' }, { status: 400 });
  }

  await db.apiKey.update({
    where: { id },
    data: { revokedAt: new Date() },
  });

  await createAuditLog({
    orgId,
    userId: user.id,
    action: 'api_key_revoked',
    metadata: { apiKeyId: id, name: apiKey.name },
  });

  return NextResponse.json({ success: true });
}