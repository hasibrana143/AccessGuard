'use client';

import { Globe, Code, Sparkles, EyeOff, XCircle, Check, Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { getSeverityBadge } from '@/lib/constants';
import type { Violation, ViolationStatus } from '@/types';

interface ViolationDetailDialogProps {
  violation: Violation | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  remediation: { remediationCode?: string; explanation?: string; confidence?: number } | null;
  remediationLoading: boolean;
  onUpdateStatus: (id: string, status: ViolationStatus) => void;
  onGenerateFix: (id: string) => void;
  isUpdating: boolean;
  isGenerating: boolean;
}

export function ViolationDetailDialog({
  violation, open, onOpenChange,
  remediation, remediationLoading,
  onUpdateStatus, onGenerateFix,
  isUpdating, isGenerating,
}: ViolationDetailDialogProps) {
  const t = useTranslations('violations');

  if (!violation) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            {violation.ruleId.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
            <Badge variant="outline" className={`text-xs ${getSeverityBadge(violation.severity)}`}>{violation.severity}</Badge>
            <Badge variant="outline" className="text-xs">WCAG {violation.wcagCriteria}</Badge>
          </DialogTitle>
          <DialogDescription className="flex items-center gap-2">
            <Globe className="h-3 w-3" />
            <a href={violation.url} target="_blank" rel="noopener noreferrer" className="hover:text-coral transition-colors">{violation.url}</a>
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-auto space-y-4">
          <div>
            <h4 className="text-sm font-medium mb-2">{t('description')}</h4>
            <p className="text-sm text-muted-foreground">{violation.description}</p>
          </div>

          {violation.elementSelector && (
            <div>
              <h4 className="text-sm font-medium mb-2">{t('elementSelectorLabel')}</h4>
              <code className="block p-3 bg-muted rounded-lg text-sm font-mono">{violation.elementSelector}</code>
            </div>
          )}

          {violation.elementHtml && (
            <div>
              <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                <Code className="h-4 w-4" />{t('currentCode')}
              </h4>
              <pre className="p-4 bg-muted rounded-lg text-sm font-mono overflow-x-auto text-red-400/80">
                <code>{violation.elementHtml}</code>
              </pre>
            </div>
          )}

          {(violation.remediationCode || remediation?.remediationCode) && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-medium flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-coral" />{t('aiSuggestedFix')}
                </h4>
                {remediation?.confidence && (
                  <Badge variant="secondary" className="text-xs">{t('confidence', { percent: Math.round(remediation.confidence * 100) })}</Badge>
                )}
              </div>
              {remediationLoading ? (
                <div className="flex items-center justify-center py-8 bg-muted rounded-lg">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <pre className="p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-lg text-sm font-mono overflow-x-auto text-emerald-500/90">
                  <code>{remediation?.remediationCode || violation.remediationCode}</code>
                </pre>
              )}
              {(remediation?.explanation || violation.aiExplanation) && (
                <div className="mt-3 p-3 bg-muted/50 rounded-lg">
                  <p className="text-sm text-muted-foreground">
                    <strong>{t('explanation')}</strong> {remediation?.explanation || violation.aiExplanation}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2 pt-4 border-t">
          <div className="flex gap-2 flex-1">
            <Button variant="outline" onClick={() => onUpdateStatus(violation.id, 'ignored')} disabled={isUpdating}>
              <EyeOff className="h-4 w-4 mr-2" />{t('ignore')}
            </Button>
            <Button variant="outline" onClick={() => onUpdateStatus(violation.id, 'false_positive')} disabled={isUpdating}>
              <XCircle className="h-4 w-4 mr-2" />{t('falsePositive')}
            </Button>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="border-emerald-500/20 text-emerald-500 hover:bg-emerald-500/10" onClick={() => onUpdateStatus(violation.id, 'fixed')} disabled={isUpdating}>
              <Check className="h-4 w-4 mr-2" />{t('markFixed')}
            </Button>
            <Button className="bg-coral hover:bg-coral/90 text-coral-foreground" onClick={() => onGenerateFix(violation.id)} disabled={isGenerating}>
              {isGenerating ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />{t('generating')}</> : <><Sparkles className="h-4 w-4 mr-2" />{t('generateFix')}</>}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
