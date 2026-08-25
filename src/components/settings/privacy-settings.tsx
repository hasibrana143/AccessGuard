'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { ShieldCheck, CheckCircle2, Download, Trash2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

export function PrivacySettings() {
  const t = useTranslations('settings');
  const tc = useTranslations('common');
  const { user } = useAuth();
  const { toast } = useToast();

  const [mfaEnabled, setMfaEnabled] = useState(false);
  const [mfaSetupQr, setMfaSetupQr] = useState<string | null>(null);
  const [mfaSetupCode, setMfaSetupCode] = useState('');
  const [mfaLoading, setMfaLoading] = useState(false);
  const [orgExporting, setOrgExporting] = useState(false);
  const [dataRegion, setDataRegion] = useState('us');
  const [regionSaving, setRegionSaving] = useState(false);

  const handleSetupMfa = async () => {
    if (!user?.id) return;
    setMfaLoading(true);
    try {
      const res = await fetch(`/api/auth/mfa/setup?userId=${encodeURIComponent(user.id)}&email=${encodeURIComponent(user.email)}`);
      const data = await res.json();
      if (data.success) {
        setMfaSetupQr(data.data.qrDataUrl);
        toast({ title: t('scanQrTitle'), description: t('scanQrMsg') });
      } else {
        toast({ title: tc('error'), description: data.error || t('setupStartFailed'), variant: 'destructive' });
      }
    } catch {
      toast({ title: tc('error'), description: t('setupStartFailed'), variant: 'destructive' });
    } finally {
      setMfaLoading(false);
    }
  };

  const handleConfirmMfa = async () => {
    if (!user?.id || mfaSetupCode.length !== 6) return;
    setMfaLoading(true);
    try {
      const res = await fetch('/api/auth/mfa/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, code: mfaSetupCode }),
      });
      const data = await res.json();
      if (data.success) {
        setMfaEnabled(true);
        setMfaSetupQr(null);
        setMfaSetupCode('');
        toast({ title: t('mfaEnabledTitle'), description: t('mfaEnabledMsg') });
      } else {
        toast({ title: tc('error'), description: data.error || t('mfaVerifyFailed'), variant: 'destructive' });
      }
    } catch {
      toast({ title: tc('error'), description: t('mfaVerifyFailed'), variant: 'destructive' });
    } finally {
      setMfaLoading(false);
    }
  };

  const handleDisableMfa = async () => {
    if (!user?.id) return;
    setMfaLoading(true);
    try {
      const res = await fetch('/api/auth/mfa/setup', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id }),
      });
      const data = await res.json();
      if (data.success) {
        setMfaEnabled(false);
        toast({ title: t('mfaDisabledTitle'), description: t('mfaDisabledMsg') });
      } else {
        toast({ title: tc('error'), description: data.error || t('mfaDisableFailed'), variant: 'destructive' });
      }
    } catch {
      toast({ title: tc('error'), description: t('mfaDisableFailed'), variant: 'destructive' });
    } finally {
      setMfaLoading(false);
    }
  };

  const handleExportData = () => {
    fetch('/api/account/export').then(async (res) => {
      if (!res.ok) throw new Error(t('exportFailed'));
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `accessguard-export-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: t('exportComplete'), description: t('exportCompleteMsg') });
    }).catch(() => toast({ title: t('exportFailed'), description: t('exportFailedMsg'), variant: 'destructive' }));
  };

  const handleOrgExport = async () => {
    setOrgExporting(true);
    try {
      const res = await fetch('/api/org/data-export');
      const data = await res.json();
      if (data.success) {
        const blob = new Blob([JSON.stringify(data.data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `accessguard-org-export-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
        toast({ title: t('exportComplete'), description: t('orgExportCompleteMsg') });
      } else {
        toast({ title: t('exportFailed'), description: data.error || t('orgExportDenied'), variant: 'destructive' });
      }
    } catch {
      toast({ title: tc('error'), description: t('orgExportFailed'), variant: 'destructive' });
    } finally {
      setOrgExporting(false);
    }
  };

  const handleSaveRegion = async () => {
    const consented = dataRegion === 'eu' ? window.confirm(t('euConsent')) : false;
    if (dataRegion === 'eu' && !consented) return;
    setRegionSaving(true);
    try {
      const res = await fetch('/api/settings/region', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dataRegion, euTransferConsent: consented || undefined }),
      });
      const data = await res.json();
      if (data.success) {
        toast({ title: t('regionUpdated'), description: t('regionUpdatedMsg', { code: data.dataRegion.toUpperCase() }) });
      } else {
        toast({ title: tc('error'), description: data.error || t('regionUpdateFailed'), variant: 'destructive' });
      }
    } catch {
      toast({ title: tc('error'), description: t('regionUpdateFailed'), variant: 'destructive' });
    } finally {
      setRegionSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    const confirmed = window.prompt(t('deletePrompt'));
    if (confirmed !== 'DELETE MY ACCOUNT') {
      toast({ title: t('deleteCanceled'), description: t('deleteConfirmHint') });
      return;
    }
    try {
      const res = await fetch('/api/account/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirmation: confirmed }),
      });
      const data = await res.json();
      if (data.success) {
        toast({ title: t('accountDeleted'), description: t('redirecting') });
        window.location.href = '/';
      } else {
        toast({ title: t('deleteCanceled'), description: data.error || t('deleteFailedTry'), variant: 'destructive' });
      }
    } catch {
      toast({ title: tc('error'), description: t('accountDeleteFailed'), variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{t('dataPrivacy')}</CardTitle>
          <CardDescription>{t('dataPrivacyDesc')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* MFA Section */}
          <div>
            <h3 className="font-medium mb-2 flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-coral" />
              {t('mfaTitle')}
            </h3>
            <p className="text-sm text-muted-foreground mb-3">{t('mfaDesc')}</p>
            {mfaEnabled ? (
              <div className="flex flex-col gap-3">
                <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 self-start">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  {t('mfaEnabled')}
                </Badge>
                <Button variant="outline" className="text-destructive" disabled={mfaLoading} onClick={handleDisableMfa}>
                  {mfaLoading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />{t('disabling')}</> : t('disableMfa')}
                </Button>
              </div>
            ) : mfaSetupQr ? (
              <div className="flex flex-col gap-3 max-w-xs">
                <img src={mfaSetupQr} alt={t('mfaQrAlt')} className="rounded-lg border border-border" />
                <div className="grid gap-2">
                  <Label htmlFor="mfa-code">{t('mfaCodeLabel')}</Label>
                  <div className="flex gap-2">
                    <Input id="mfa-code" type="text" inputMode="numeric" maxLength={6} value={mfaSetupCode} onChange={(e) => setMfaSetupCode(e.target.value.replace(/\D/g, ''))} placeholder="123456" className="text-center text-lg tracking-[0.3em] font-mono" />
                    <Button className="bg-coral hover:bg-coral/90 text-coral-foreground" disabled={mfaLoading || mfaSetupCode.length !== 6} onClick={handleConfirmMfa}>
                      {mfaLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : t('enable')}
                    </Button>
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setMfaSetupQr(null)}>{tc('cancel')}</Button>
              </div>
            ) : (
              <Button variant="outline" disabled={mfaLoading} onClick={handleSetupMfa}>
                {mfaLoading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />{t('preparing')}</> : t('setUpMfa')}
              </Button>
            )}
          </div>

          {/* Export Data */}
          <div>
            <h3 className="font-medium mb-2">{t('exportData')}</h3>
            <p className="text-sm text-muted-foreground mb-3">{t('exportDataDesc')}</p>
            <Button variant="outline" onClick={handleExportData}>
              <Download className="h-4 w-4 mr-2" />
              {t('exportMyData')}
            </Button>
          </div>

          {/* Org Export */}
          <div>
            <h3 className="font-medium mb-2">{t('orgExportTitle')}</h3>
            <p className="text-sm text-muted-foreground mb-3">{t('orgExportDesc')}</p>
            <Button variant="outline" disabled={orgExporting} onClick={handleOrgExport}>
              {orgExporting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />{t('exporting')}</> : <><Download className="h-4 w-4 mr-2" />{t('exportOrgData')}</>}
            </Button>
          </div>

          {/* Data Residency */}
          <div className="border-t border-border pt-6">
            <h3 className="font-medium mb-2 flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-coral" />
              {t('dataResidency')}
            </h3>
            <p className="text-sm text-muted-foreground mb-3">{t('dataResidencyDesc')}</p>
            <div className="flex items-end gap-3">
              <div className="grid gap-2 flex-1">
                <Label htmlFor="data-region">{t('region')}</Label>
                <Select value={dataRegion} onValueChange={setDataRegion} disabled={regionSaving}>
                  <SelectTrigger id="data-region" className="w-full">
                    <SelectValue placeholder={t('selectRegion')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="us">{t('regionUs')}</SelectItem>
                    <SelectItem value="eu">{t('regionEu')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button variant="outline" disabled={regionSaving} onClick={handleSaveRegion}>
                {regionSaving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />{t('saving')}</> : t('saveRegion')}
              </Button>
            </div>
          </div>

          {/* Delete Account */}
          <div className="border-t border-border pt-6">
            <h3 className="font-medium mb-2 text-destructive">{t('deleteAccount')}</h3>
            <p className="text-sm text-muted-foreground mb-3">{t('deleteAccountDesc')}</p>
            <Button variant="destructive" onClick={handleDeleteAccount}>
              <Trash2 className="h-4 w-4 mr-2" />
              {t('deleteAccount')}
            </Button>
          </div>

          {/* Legal Documents */}
          <div className="border-t border-border pt-6">
            <h3 className="font-medium mb-2">{t('legalDocuments')}</h3>
            <div className="flex gap-3">
              <Button variant="ghost" onClick={() => window.open('/api/legal/privacy', '_blank')}>{t('privacyPolicy')}</Button>
              <Button variant="ghost" onClick={() => window.open('/api/legal/tos', '_blank')}>{t('termsOfService')}</Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
