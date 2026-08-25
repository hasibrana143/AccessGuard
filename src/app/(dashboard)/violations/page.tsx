'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { Download, Github, CheckCircle2, CheckSquare, Square, Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useViolations, useRemediation, useUpdateViolationStatus, useGenerateRemediation, useBulkUpdateViolations } from '@/hooks/useApi';
import { ViolationFilters } from '@/components/violations/violation-filters';
import { ViolationRow } from '@/components/violations/violation-row';
import { ViolationDetailDialog } from '@/components/violations/violation-detail-dialog';
import { CreatePrDialog } from '@/components/violations/create-pr-dialog';
import type { Violation, Severity, ViolationStatus } from '@/types';

export default function ViolationsPage() {
  const t = useTranslations('violations');
  const tc = useTranslations('common');
  const { toast } = useToast();

  // Filters
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('open');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<string>('severity-desc');
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 25;

  // Selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Dialogs
  const [selectedViolation, setSelectedViolation] = useState<Violation | null>(null);
  const [prDialogOpen, setPrDialogOpen] = useState(false);

  // Data
  const bulkUpdate = useBulkUpdateViolations();
  const { data: violationsData, isLoading } = useViolations({ severity: severityFilter as Severity | 'all', status: statusFilter as ViolationStatus | 'all', limit: 100 });
  const { data: remediation, isLoading: remediationLoading } = useRemediation(selectedViolation?.id || null);
  const updateStatus = useUpdateViolationStatus();
  const generateRemediation = useGenerateRemediation();

  // Filtering + sorting
  const filteredViolations = useMemo(() => {
    if (!Array.isArray(violationsData)) return [];
    let list = violationsData;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      list = list.filter(v => v.ruleId.toLowerCase().includes(query) || v.description.toLowerCase().includes(query) || v.url.toLowerCase().includes(query));
    }
    const severityRank = { critical: 0, serious: 1, moderate: 2, minor: 3 } as const;
    switch (sortBy) {
      case 'severity-asc': list = [...list].sort((a, b) => (severityRank[b.severity] ?? 9) - (severityRank[a.severity] ?? 9)); break;
      case 'severity-desc': list = [...list].sort((a, b) => (severityRank[a.severity] ?? 9) - (severityRank[b.severity] ?? 9)); break;
      case 'date-new': list = [...list].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()); break;
      case 'date-old': list = [...list].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()); break;
      case 'rule': list = [...list].sort((a, b) => a.ruleId.localeCompare(b.ruleId)); break;
      default: list = [...list].sort((a, b) => (severityRank[a.severity] ?? 9) - (severityRank[b.severity] ?? 9));
    }
    return list;
  }, [violationsData, searchQuery, sortBy]);

  const totalPages = Math.max(1, Math.ceil(filteredViolations.length / PAGE_SIZE));
  const pagedViolations = useMemo(() => {
    const safePage = Math.min(page, totalPages);
    return filteredViolations.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  }, [filteredViolations, page, totalPages]);

  useEffect(() => { setPage(1); }, [severityFilter, statusFilter, searchQuery, sortBy]);

  // Handlers
  const handleStatusUpdate = async (id: string, status: ViolationStatus) => {
    try { await updateStatus.mutateAsync({ id, status }); toast({ title: t('updated'), description: t('markedAs', { status }) }); setSelectedViolation(null); }
    catch { toast({ title: tc('error'), description: t('updateFailed'), variant: 'destructive' }); }
  };

  const handleGenerateFix = async (violationId: string) => {
    try { await generateRemediation.mutateAsync({ violationId, forceRegenerate: true }); toast({ title: t('fixGenerated'), description: t('fixGeneratedMsg') }); }
    catch { toast({ title: tc('error'), description: t('fixFailed'), variant: 'destructive' }); }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredViolations.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(filteredViolations.map(v => v.id)));
  };

  const handleBulkStatusUpdate = async (status: ViolationStatus) => {
    try {
      const ids = Array.from(selectedIds);
      const firstViolation = filteredViolations.find(v => ids.includes(v.id));
      const projectId = firstViolation?.projectId;
      if (!projectId) { toast({ title: tc('error'), description: t('bulkNoProject'), variant: 'destructive' }); return; }
      await bulkUpdate.mutateAsync({ ids, status, projectId });
      toast({ title: t('updated'), description: t('bulkUpdated', { count: ids.length, status }) });
      setSelectedIds(new Set());
    } catch { toast({ title: tc('error'), description: t('bulkUpdateFailed'), variant: 'destructive' }); }
  };

  const selectedFixCount = filteredViolations.filter(v => v.remediationCode).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t('title')}</h1>
          <p className="text-muted-foreground">{t('subtitle')}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => {
            const params = new URLSearchParams();
            if (severityFilter !== 'all') params.append('severity', severityFilter);
            if (statusFilter !== 'all') params.append('status', statusFilter);
            window.open(`/api/violations/export?${params}`, '_blank');
          }}>
            <Download className="h-4 w-4 mr-2" />{t('exportCsv')}
          </Button>
          <Button className="bg-coral hover:bg-coral/90 text-coral-foreground" onClick={() => setPrDialogOpen(true)}>
            <Github className="h-4 w-4 mr-2" />{t('createFixPrs')}
          </Button>
        </div>
      </div>

      <ViolationFilters searchQuery={searchQuery} onSearchChange={setSearchQuery} severityFilter={severityFilter} onSeverityChange={setSeverityFilter} statusFilter={statusFilter} onStatusChange={setStatusFilter} sortBy={sortBy} onSortChange={setSortBy} totalCount={filteredViolations.length} />

      {selectedIds.size > 0 && (
        <Card className="border-coral/30 bg-coral/5">
          <CardContent className="py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckSquare className="h-4 w-4 text-coral" />
                <span className="text-sm font-medium">{t('selected', { count: selectedIds.size })}</span>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => handleBulkStatusUpdate('fixed')} disabled={bulkUpdate.isPending}><CheckSquare className="h-4 w-4 mr-1" />{t('markFixed')}</Button>
                <Button variant="outline" size="sm" onClick={() => setSelectedIds(new Set())}>{t('clear')}</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
      ) : (
        <div className="space-y-3">
          {filteredViolations.length > 0 && (
            <div className="flex items-center gap-2 px-1">
              <button onClick={toggleSelectAll} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
                {selectedIds.size === filteredViolations.length ? <CheckSquare className="h-3.5 w-3.5" /> : <Square className="h-3.5 w-3.5" />}
                {t('selectAll')}
              </button>
            </div>
          )}
          {pagedViolations.map((violation) => (
            <ViolationRow key={violation.id} violation={violation} isSelected={selectedIds.has(violation.id)} onToggleSelect={() => toggleSelect(violation.id)} onViewFix={() => setSelectedViolation(violation)} />
          ))}
          {filteredViolations.length === 0 && (
            <Card>
              <CardContent className="py-16 text-center">
                <CheckCircle2 className="h-16 w-16 mx-auto mb-4 text-emerald-500" />
                <h3 className="text-lg font-semibold mb-2">{t('noViolationsFound')}</h3>
                <p className="text-muted-foreground">{searchQuery ? t('adjustSearch') : t('allResolved')}</p>
              </CardContent>
            </Card>
          )}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-4">
              <p className="text-sm text-muted-foreground">{t('pageOf', { current: Math.min(page, totalPages), total: totalPages, count: filteredViolations.length })}</p>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))}>{t('previous')}</Button>
                <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))}>{t('next')}</Button>
              </div>
            </div>
          )}
        </div>
      )}

      <ViolationDetailDialog violation={selectedViolation} open={!!selectedViolation} onOpenChange={() => setSelectedViolation(null)} remediation={remediation ?? null} remediationLoading={remediationLoading} onUpdateStatus={handleStatusUpdate} onGenerateFix={handleGenerateFix} isUpdating={updateStatus.isPending} isGenerating={generateRemediation.isPending} />
      <CreatePrDialog open={prDialogOpen} onOpenChange={setPrDialogOpen} violationIds={selectedIds.size > 0 ? Array.from(selectedIds) : filteredViolations.filter(v => v.remediationCode).map(v => v.id)} totalCount={selectedFixCount} />
    </div>
  );
}
