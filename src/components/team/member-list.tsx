'use client';

import { useTranslations } from 'next-intl';
import { ShieldCheck, Crown, Trash2, Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Member } from './types';

interface MemberListProps {
  members: Member[];
  currentUserId?: string;
  onRoleChange: (member: Member, role: string) => void;
  onRemove: (member: Member) => void;
  roleLabels: Record<string, string>;
}

export function MemberList({ members, currentUserId, onRoleChange, onRemove, roleLabels }: MemberListProps) {
  const t = useTranslations('team');

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-coral" />
          {t('teamMembers')}
        </CardTitle>
        <CardDescription>{t('membersDesc', { count: members.length })}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {members.map((member) => (
          <div key={member.id} className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 p-3 rounded-lg bg-muted/30">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <Avatar className="h-10 w-10 shrink-0">
                <AvatarImage src={member.avatar || undefined} alt={member.name || member.email} />
                <AvatarFallback className="bg-coral/10 text-coral">
                  {(member.name || member.email).charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium truncate">{member.name || member.email}</span>
                  {member.role === 'owner' && <Crown className="h-4 w-4 text-yellow-500 shrink-0" />}
                  {member.id === currentUserId && <Badge variant="outline" className="text-xs shrink-0">{t('you')}</Badge>}
                </div>
                <p className="text-sm text-muted-foreground truncate">{member.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {member.role !== 'owner' ? (
                <Select value={member.role} onValueChange={(role) => onRoleChange(member, role)}>
                  <SelectTrigger className="w-28" aria-label={t('changeRoleAria', { name: member.name || member.email })}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">{roleLabels.admin}</SelectItem>
                    <SelectItem value="member">{roleLabels.member}</SelectItem>
                    <SelectItem value="viewer">{roleLabels.viewer}</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <Badge variant="outline" className="text-xs">{roleLabels.admin}</Badge>
              )}
              {member.role !== 'owner' && member.id !== currentUserId && (
                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" aria-label={t('removeMemberAria', { name: member.name || member.email })} onClick={() => onRemove(member)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        ))}
        {members.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">{t('noMembers')}</p>
        )}
      </CardContent>
    </Card>
  );
}
