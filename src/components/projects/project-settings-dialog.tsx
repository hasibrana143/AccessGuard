'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Code, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useVerifyProject } from '@/hooks/useApi';

interface ProjectSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: { id: string; name: string; url: string; isVerified?: boolean; scanConfig?: string } | null;
}

export function ProjectSettingsDialog({ open, onOpenChange, project }: ProjectSettingsDialogProps) {
  const t = useTranslations('projects');
  const tc = useTranslations('common');
  const { toast } = useToast();
  const verifyProject = useVerifyProject();
  const [scanSettings, setScanSettings] = useState({ requestDelay: 500, userAgent: 'default', timeout: 30000, retryCount: 3 });
  const [localVerified, setLocalVerified] = useState(false);

  useEffect(() => {
    if (project) {
      setLocalVerified(project.isVerified || false);
      if (project.scanConfig) {
        try {
          const parsed = JSON.parse(project.scanConfig);
          setScanSettings({ requestDelay: parsed.requestDelay || 500, userAgent: parsed.userAgent || 'default', timeout: parsed.timeout || 30000, retryCount: parsed.retryCount || 3 });
        } catch { /* ignore */ }
      }
    }
  }, [project]);

  const handleSave = async () => {
    try {
      const response = await fetch('/api/projects', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: project?.id, scanConfig: JSON.stringify(scanSettings) }),
      });
      if (response.ok) {
        toast({ title: t('settingsSaved'), description: t('settingsSavedMsg') });
        onOpenChange(false);
      }
    } catch {
      toast({ title: tc('error'), description: t('settingsSaveFailed'), variant: 'destructive' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t('settingsTitle', { name: project?.name || '' })}</DialogTitle>
          <DialogDescription>{t('settingsDesc')}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          {project && (
            <div className="p-4 rounded-lg bg-muted/50">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium">{t('domainVerification')}</span>
                <div className="flex items-center gap-2">
                  {localVerified ? (
                    <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20">
                      <CheckCircle2 className="h-3 w-3 mr-1" />{t('verified')}
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-orange-500 border-orange-500/20">
                      <AlertCircle className="h-3 w-3 mr-1" />{t('unverified')}
                    </Badge>
                  )}
                </div>
              </div>
              <p className="text-sm text-muted-foreground">{localVerified ? t('verifiedDesc') : t('unverifiedDesc')}</p>
            </div>
          )}
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label>{t('userAgent')}</Label>
              <Select value={scanSettings.userAgent} onValueChange={(v) => setScanSettings({ ...scanSettings, userAgent: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="default">{t('agDefault')}</SelectItem>
                  <SelectItem value="chrome">{t('chrome')}</SelectItem>
                  <SelectItem value="firefox">{t('firefox')}</SelectItem>
                  <SelectItem value="safari">{t('safari')}</SelectItem>
                  <SelectItem value="googlebot">{t('googlebot')}</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">{t('userAgentHint')}</p>
            </div>
            <div className="grid gap-2">
              <Label>{t('requestDelay')}</Label>
              <Input type="number" value={scanSettings.requestDelay} onChange={(e) => setScanSettings({ ...scanSettings, requestDelay: parseInt(e.target.value) || 500 })} min={0} max={10000} />
              <p className="text-xs text-muted-foreground">{t('requestDelayHint')}</p>
            </div>
            <div className="grid gap-2">
              <Label>{t('retryAttempts')}</Label>
              <Input type="number" value={scanSettings.retryCount} onChange={(e) => setScanSettings({ ...scanSettings, retryCount: parseInt(e.target.value) || 3 })} min={1} max={10} />
              <p className="text-xs text-muted-foreground">{t('retryAttemptsHint')}</p>
            </div>
          </div>
          <div className="p-4 rounded-lg bg-coral/5 border border-coral/20">
            <div className="flex items-start gap-3">
              <Code className="h-5 w-5 text-coral mt-0.5" />
              <div>
                <h4 className="font-medium text-sm">{t('cantScanAuto')}</h4>
                <p className="text-xs text-muted-foreground mt-1">{t('cantScanAutoDesc')}</p>
              </div>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>{tc('cancel')}</Button>
          <Button className="bg-coral hover:bg-coral/90 text-coral-foreground" onClick={handleSave}>{t('saveSettings')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
