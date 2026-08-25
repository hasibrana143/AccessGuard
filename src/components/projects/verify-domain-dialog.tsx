'use client';

import { useTranslations } from 'next-intl';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';

interface VerifyDomainDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  verificationData: {
    verificationToken: string;
    instructions: { method: string; html: string; location: string; domain: string };
    alternativeMethods: Array<{ method: string; instruction: string }>;
  } | null;
  isChecking: boolean;
  onCheck: () => void;
}

export function VerifyDomainDialog({ open, onOpenChange, verificationData, isChecking, onCheck }: VerifyDomainDialogProps) {
  const t = useTranslations('projects');
  const tc = useTranslations('common');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-coral" />
            {t('verifyDomainTitle')}
          </DialogTitle>
          <DialogDescription>{t('verifyDomainDesc')}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {verificationData && (
            <>
              <div className="p-4 bg-muted rounded-lg">
                <Label className="text-xs font-medium mb-2 block">{t('metaTag')}</Label>
                <code className="block p-3 bg-background rounded border text-sm font-mono break-all">{verificationData.instructions.html}</code>
                <p className="text-xs text-muted-foreground mt-2">{t('addToHead')} <strong>{'<head>'}</strong> {t('headSection', { domain: verificationData.instructions.domain })}</p>
              </div>
              <details className="text-sm">
                <summary className="cursor-pointer text-muted-foreground hover:text-foreground">{t('altMethods')}</summary>
                <div className="mt-2 space-y-2 pl-4">
                  {verificationData.alternativeMethods.map((alt, i) => (
                    <div key={i} className="p-3 bg-muted rounded-lg">
                      <p className="text-xs font-medium mb-1 uppercase text-muted-foreground">{alt.method}</p>
                      <code className="text-sm font-mono">{alt.instruction}</code>
                    </div>
                  ))}
                </div>
              </details>
            </>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>{tc('close')}</Button>
          <Button className="bg-coral hover:bg-coral/90 text-coral-foreground" onClick={onCheck} disabled={isChecking}>
            {isChecking ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />{t('checking')}</> : <><CheckCircle2 className="h-4 w-4 mr-2" />{t('verifyNow')}</>}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
