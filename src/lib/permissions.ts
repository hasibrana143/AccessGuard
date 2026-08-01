import { db } from '@/lib/db';
import { PERMISSIONS, ALL_PERMISSIONS, PERMISSION_LABELS, type Permission } from '@/lib/permission-defs';

export { PERMISSIONS, ALL_PERMISSIONS, PERMISSION_LABELS };
export type { Permission } from '@/lib/permission-defs';

// Base permissions every member has
const MEMBER_PERMISSIONS: ReadonlySet<Permission> = new Set([
  PERMISSIONS.VIEW_PROJECTS,
  PERMISSIONS.RUN_SCANS,
  PERMISSIONS.MANAGE_VIOLATIONS,
  PERMISSIONS.GENERATE_REMEDIATION,
  PERMISSIONS.CREATE_PR,
  PERMISSIONS.GENERATE_REPORTS,
]);

const ADMIN_PERMISSIONS: ReadonlySet<Permission> = new Set(
  ALL_PERMISSIONS.filter((p) => p !== PERMISSIONS.MANAGE_BILLING)
);

const OWNER_PERMISSIONS: ReadonlySet<Permission> = new Set(ALL_PERMISSIONS);

const BUILT_IN_MATRIX: Record<string, ReadonlySet<Permission>> = {
  owner: OWNER_PERMISSIONS,
  admin: ADMIN_PERMISSIONS,
};

export function safeParsePermissions(raw: string | null | undefined): Permission[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((p): p is Permission => ALL_PERMISSIONS.includes(p));
  } catch {
    return [];
  }
}

// Effective permissions for a user: built-in tier matrix wins for
// owner/admin; members get the base set plus any assigned custom role.
export async function resolvePermissions(userId: string): Promise<ReadonlySet<Permission>> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { role: true, customRole: { select: { permissions: true } } },
  });
  if (!user) return new Set<Permission>();
  const builtIn = BUILT_IN_MATRIX[user.role];
  if (builtIn) return builtIn;
  const custom = user.customRole ? safeParsePermissions(user.customRole.permissions) : [];
  return new Set([...MEMBER_PERMISSIONS, ...custom]);
}
