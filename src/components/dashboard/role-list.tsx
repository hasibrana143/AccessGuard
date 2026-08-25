'use client';

import { useTranslations } from 'next-intl';
import { Trash2, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PERMISSION_LABELS, type Permission } from '@/lib/permission-defs';

interface CustomRole {
  id: string;
  name: string;
  description: string | null;
  permissions: Permission[];
  members: Array<{ id: string; name: string | null; email: string }>;
}

interface RoleListProps {
  roles: CustomRole[];
  onDelete: (role: CustomRole) => void;
}

export function RoleList({ roles, onDelete }: RoleListProps) {
  const t = useTranslations('dash');

  if (roles.length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-4">{t('noCustomRoles')}</p>;
  }

  return (
    <div className="space-y-3">
      {roles.map((role) => (
        <div key={role.id} className="p-4 border border-border rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <div>
              <p className="font-medium">{role.name}</p>
              {role.description && <p className="text-xs text-muted-foreground">{role.description}</p>}
            </div>
            <div className="flex items-center gap-2">
              {role.members.length > 0 && (
                <Badge variant="outline" className="text-xs">{t('memberCount', { count: role.members.length })}</Badge>
              )}
              <Button variant="ghost" size="icon" aria-label={t('deleteRoleAria', { name: role.name })} onClick={() => onDelete(role)}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {role.permissions.map((p) => (
              <Badge key={p} variant="secondary" className="text-xs font-normal">{PERMISSION_LABELS[p].label}</Badge>
            ))}
          </div>
          {role.members.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {role.members.map((m) => (
                <span key={m.id} className="text-xs text-muted-foreground inline-flex items-center gap-1">
                  <ShieldCheck className="h-3 w-3" />{m.name || m.email}
                </span>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
