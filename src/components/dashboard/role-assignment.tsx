'use client';

import { useTranslations } from 'next-intl';
import { UserCog } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface Member {
  id: string;
  email: string;
  name: string | null;
  role: string;
  customRoleId: string | null;
}

interface CustomRole {
  id: string;
  name: string;
}

interface RoleAssignmentProps {
  members: Member[];
  roles: CustomRole[];
  assigningId: string | null;
  onAssign: (member: Member, customRoleId: string) => void;
}

export function RoleAssignment({ members, roles, assigningId, onAssign }: RoleAssignmentProps) {
  const t = useTranslations('dash');
  const regularMembers = members.filter((m) => m.role === 'member');

  return (
    <div className="p-4 border border-border rounded-lg space-y-4">
      <div>
        <p className="font-medium text-sm mb-1">{t('assignToMembers')}</p>
        <p className="text-xs text-muted-foreground">{t('assignDesc')}</p>
      </div>
      {regularMembers.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t('noMembers')}</p>
      ) : (
        <div className="space-y-2">
          {regularMembers.map((member) => (
            <div key={member.id} className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 min-w-0">
                <UserCog className="h-4 w-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{member.name || member.email}</p>
                  <p className="text-xs text-muted-foreground truncate">{member.email}</p>
                </div>
              </div>
              <Select value={member.customRoleId ?? ''} disabled={assigningId === member.id} onValueChange={(value) => onAssign(member, value)}>
                <SelectTrigger className="w-[190px]" aria-label={t('customRoleForAria', { name: member.name || member.email })}>
                  <SelectValue placeholder={t('noCustomRole')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">{t('noCustomRole')}</SelectItem>
                  {roles.map((role) => (
                    <SelectItem key={role.id} value={role.id}>{role.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
