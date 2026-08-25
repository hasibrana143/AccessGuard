'use client';

import { useTranslations } from 'next-intl';
import { Search } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface ViolationFiltersProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  severityFilter: string;
  onSeverityChange: (severity: string) => void;
  statusFilter: string;
  onStatusChange: (status: string) => void;
  sortBy: string;
  onSortChange: (sort: string) => void;
  totalCount: number;
}

export function ViolationFilters({
  searchQuery, onSearchChange,
  severityFilter, onSeverityChange,
  statusFilter, onStatusChange,
  sortBy, onSortChange,
  totalCount,
}: ViolationFiltersProps) {
  const t = useTranslations('violations');

  return (
    <Card>
      <CardContent className="py-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="relative flex-1 min-w-64">
            <Label htmlFor="violations-search" className="sr-only">{t('searchLabel')}</Label>
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" aria-hidden="true" />
            <Input id="violations-search" placeholder={t('searchPlaceholder')} value={searchQuery} onChange={(e) => onSearchChange(e.target.value)} className="pl-9" autoComplete="off" />
          </div>
          <Select value={severityFilter} onValueChange={onSeverityChange}>
            <SelectTrigger className="w-40" aria-label={t('filterBySeverity')}>
              <SelectValue placeholder={t('severity')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('allSeverities')}</SelectItem>
              <SelectItem value="critical">{t('critical')}</SelectItem>
              <SelectItem value="serious">{t('serious')}</SelectItem>
              <SelectItem value="moderate">{t('moderate')}</SelectItem>
              <SelectItem value="minor">{t('minor')}</SelectItem>
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={onStatusChange}>
            <SelectTrigger className="w-40" aria-label={t('filterByStatus')}>
              <SelectValue placeholder={t('status')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('allStatuses')}</SelectItem>
              <SelectItem value="open">{t('open')}</SelectItem>
              <SelectItem value="fixed">{t('fixed')}</SelectItem>
              <SelectItem value="ignored">{t('ignored')}</SelectItem>
            </SelectContent>
          </Select>
          <Select value={sortBy} onValueChange={onSortChange}>
            <SelectTrigger className="w-44" aria-label={t('sortByLabel')}>
              <SelectValue placeholder={t('sortByLabel')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="severity-desc">{t('sortSeverityDesc')}</SelectItem>
              <SelectItem value="severity-asc">{t('sortSeverityAsc')}</SelectItem>
              <SelectItem value="date-new">{t('sortNewest')}</SelectItem>
              <SelectItem value="date-old">{t('sortOldest')}</SelectItem>
              <SelectItem value="rule">{t('sortRule')}</SelectItem>
            </SelectContent>
          </Select>
          <Badge variant="secondary" className="px-3 py-1">
            {t('count', { count: totalCount })}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}
