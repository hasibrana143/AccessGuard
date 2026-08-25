'use client';

import { useTranslations } from 'next-intl';
import { Users, UserCog } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatRelativeTime } from '@/lib/constants';

interface AdminUser {
  id: string;
  email: string;
  name: string | null;
  role: string;
  createdAt: string;
  emailVerifiedAt: string | null;
  mfaEnabledAt: string | null;
}

interface AdminUsersProps {
  users: AdminUser[];
  onRoleChange: (userId: string, role: string) => void;
}

export function AdminUsers({ users, onRoleChange }: AdminUsersProps) {
  const t = useTranslations('admin');

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <Users className="h-5 w-5 text-coral" />{t('userManagement')}
        </CardTitle>
        <CardDescription>{t('userManagementDesc')}</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y divide-border">
          {users.map((u) => (
            <div key={u.id} className="flex items-center gap-4 p-4">
              <div className="p-2.5 rounded-lg bg-muted flex-shrink-0">
                <UserCog className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="font-medium text-sm truncate">{u.name || t('unnamed')}</span>
                  <Badge variant="outline" className="text-xs">{u.role}</Badge>
                  {u.emailVerifiedAt && <Badge variant="outline" className="text-xs border-emerald-500/20 text-emerald-500">{t('verified')}</Badge>}
                  {u.mfaEnabledAt && <Badge variant="outline" className="text-xs border-blue-500/20 text-blue-500">{t('mfa')}</Badge>}
                </div>
                <p className="text-xs text-muted-foreground truncate">{t('joined', { email: u.email, date: formatRelativeTime(u.createdAt) })}</p>
              </div>
              <Select value={u.role} onValueChange={(role) => onRoleChange(u.id, role)}>
                <SelectTrigger className="w-28" aria-label={t('roleAria', { email: u.email })}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">{t('admin')}</SelectItem>
                  <SelectItem value="member">{t('member')}</SelectItem>
                  <SelectItem value="viewer">{t('viewer')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          ))}
          {users.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">{t('noUsers')}</p>}
        </div>
      </CardContent>
    </Card>
  );
}
