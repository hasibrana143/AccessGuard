'use client';

import { useMemo, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useManualChecks, useSaveManualChecks } from '@/hooks/useManualChecks';
import { useToast } from '@/hooks/use-toast';
import { Loader2, CheckCircle, XCircle, MinusCircle, CircleHelp, ChevronDown } from 'lucide-react';
import type { ManualCheckItem, ManualCheckSaveItem, ManualCheckStatus } from '@/types';

const STATUS_ORDER: ManualCheckStatus[] = ['pending', 'pass', 'fail', 'na'];

const STATUS_ICON: Record<ManualCheckStatus, typeof CircleHelp> = {
  pending: CircleHelp,
  pass: CheckCircle,
  fail: XCircle,
  na: MinusCircle,
};

export function ManualChecksTab({ projectId }: { projectId: string }) {
  const t = useTranslations('pdetail');
  const locale = useLocale();
  const { toast } = useToast();
  const { data: checks = [], isLoading } = useManualChecks(projectId);
  const saveMutation = useSaveManualChecks(projectId);
  const [draft, setDraft] = useState<Record<string, { status: ManualCheckStatus; notes: string }>>({});
  const [open, setOpen] = useState<Record<string, boolean>>({});

  const merged = useMemo(
    () =>
      checks.map((c) => ({
        ...c,
        status: draft[c.id]?.status ?? c.status,
        notes: draft[c.id]?.notes ?? c.notes ?? '',
      })),
    [checks, draft]
  );

  const done = merged.filter((c) => c.status !== 'pending').length;
  const dirty = Object.keys(draft).length > 0;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const setStatus = (id: string, status: ManualCheckStatus) =>
    setDraft((d) => ({ ...d, [id]: { status, notes: d[id]?.notes ?? merged.find((c) => c.id === id)?.notes ?? '' } }));

  const setNotes = (id: string, notes: string) =>
    setDraft((d) => ({
      ...d,
      [id]: { status: d[id]?.status ?? merged.find((c) => c.id === id)?.status ?? 'pending', notes },
    }));

  const handleSave = () => {
    const results: ManualCheckSaveItem[] = Object.entries(draft).map(([checkId, v]) => ({
      checkId,
      status: v.status,
      notes: v.notes || undefined,
    }));
    saveMutation.mutate(results, {
      onSuccess: () => {
        setDraft({});
        toast({ title: t('manualSaved'), description: t('manualSavedDesc', { count: results.length }) });
      },
      onError: (err) => {
        toast({ title: t('manualSaveFailed'), description: err.message, variant: 'destructive' });
      },
    });
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <CardTitle className="text-lg">{t('manualTitle')}</CardTitle>
              <CardDescription>{t('manualDesc', { done, total: merged.length })}</CardDescription>
            </div>
            <Button onClick={handleSave} disabled={!dirty || saveMutation.isPending}>
              {saveMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {t('saving')}
                </>
              ) : (
                t('saveManual')
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {merged.map((check: ManualCheckItem & { notes: string }) => {
            const Icon = STATUS_ICON[check.status];
            const title = locale === 'hi' ? check.titleHi : check.titleEn;
            const steps = locale === 'hi' ? check.stepsHi : check.stepsEn;
            const isOpen = open[check.id] ?? false;
            return (
              <div key={check.id} className="border border-border rounded-lg">
                <div className="flex flex-wrap items-center gap-2 p-3">
                  <Icon
                    className={`h-5 w-5 shrink-0 ${
                      check.status === 'pass'
                        ? 'text-green-600'
                        : check.status === 'fail'
                          ? 'text-destructive'
                          : check.status === 'na'
                            ? 'text-muted-foreground'
                            : 'text-amber-500'
                    }`}
                    aria-hidden
                  />
                  <div className="flex-1 min-w-40">
                    <p className="font-medium text-sm">{title}</p>
                    <p className="text-xs text-muted-foreground">
                      WCAG {check.wcag} · {t('level')} {check.level}
                    </p>
                  </div>
                  <div className="flex gap-1" role="group" aria-label={title}>
                    {STATUS_ORDER.map((s) => (
                      <Button
                        key={s}
                        variant={check.status === s ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setStatus(check.id, s)}
                        aria-pressed={check.status === s}
                      >
                        {t(`manual_${s}`)}
                      </Button>
                    ))}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setOpen((o) => ({ ...o, [check.id]: !isOpen }))}
                    aria-expanded={isOpen}
                  >
                    <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                    <span className="sr-only">{t('manualSteps')}</span>
                  </Button>
                </div>
                {isOpen && (
                  <div className="px-3 pb-3 pt-0 space-y-2">
                    <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
                      {steps.map((step, i) => (
                        <li key={i}>{step}</li>
                      ))}
                    </ol>
                    <label className="block text-xs font-medium" htmlFor={`notes-${check.id}`}>
                      {t('manualNotes')}
                    </label>
                    <textarea
                      id={`notes-${check.id}`}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      rows={2}
                      value={check.notes}
                      onChange={(e) => setNotes(check.id, e.target.value)}
                      placeholder={t('manualNotesPlaceholder')}
                    />
                  </div>
                )}
              </div>
            );
          })}
          {merged.length > 0 && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Badge variant="secondary">
                {t('manualProgress', { done, total: merged.length })}
              </Badge>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
