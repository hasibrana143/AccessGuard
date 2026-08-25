'use client';

import { useTranslations } from 'next-intl';
import { Filter } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ACTION_LABELS } from './audit-log-list';

interface AuditFiltersProps {
  actionFilter: string;
  onActionFilterChange: (value: string) => void;
  total: number;
}

export function AuditFilters({ actionFilter, onActionFilterChange, total }: AuditFiltersProps) {
  const t = useTranslations('audit');

  const actionLabel = (action: string) => {
    const label = t(`actions.${action}`);
    return label && !label.startsWith('actions.') ? label : action.replace(/_/g, ' ');
  };

  return (
    <Card>
      <CardContent className="py-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select value={actionFilter} onValueChange={onActionFilterChange}>
              <SelectTrigger className="w-56" aria-label={t('filterAria')}>
                <SelectValue placeholder={t('allActions')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('allActions')}</SelectItem>
                {ACTION_LABELS.map((value) => (
                  <SelectItem key={value} value={value}>{actionLabel(value)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Badge variant="secondary" className="px-3 py-1">
            {t('events', { count: total })}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}
