'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { ThemeToggle } from '@/components/dashboard/theme-toggle';

export function AppearanceSettings() {
  const t = useTranslations('settings');
  const tc = useTranslations('common');
  const { user } = useAuth();
  const { toast } = useToast();

  const [branding, setBranding] = useState<{ displayName: string; primaryColor: string }>({ displayName: '', primaryColor: '#d94545' });
  const [brandingSaving, setBrandingSaving] = useState(false);

  const handleSaveBranding = async () => {
    setBrandingSaving(true);
    try {
      const res = await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orgId: user?.orgId, settings: { branding } }),
      });
      const data = await res.json();
      if (data.success) {
        document.documentElement.style.setProperty('--primary', branding.primaryColor);
        document.documentElement.style.setProperty('--coral', branding.primaryColor);
        toast({ title: t('brandingSaved'), description: t('brandingSavedMsg') });
      } else {
        toast({ title: tc('error'), description: data.error || t('brandingSaveFailed'), variant: 'destructive' });
      }
    } catch {
      toast({ title: tc('error'), description: t('brandingSaveFailed'), variant: 'destructive' });
    } finally {
      setBrandingSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{t('appearance')}</CardTitle>
          <CardDescription>{t('appearanceDesc')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">{t('theme')}</p>
              <p className="text-sm text-muted-foreground">{t('themeDesc')}</p>
            </div>
            <ThemeToggle />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('branding')}</CardTitle>
          <CardDescription>{t('brandingDesc')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="brand-name">{t('displayName')}</Label>
            <Input id="brand-name" value={branding.displayName} onChange={(e) => setBranding((prev) => ({ ...prev, displayName: e.target.value }))} placeholder={t('displayNamePlaceholder')} maxLength={60} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="brand-color">{t('primaryColor')}</Label>
            <div className="flex items-center gap-3">
              <input id="brand-color" type="color" value={branding.primaryColor} onChange={(e) => setBranding((prev) => ({ ...prev, primaryColor: e.target.value }))} className="h-10 w-14 rounded-md border border-border bg-transparent cursor-pointer" aria-label={t('brandColorAria')} />
              <Input value={branding.primaryColor} onChange={(e) => setBranding((prev) => ({ ...prev, primaryColor: e.target.value }))} className="w-32 font-mono text-sm" aria-label={t('brandColorHexAria')} maxLength={7} />
              <div className="h-10 w-10 rounded-md border border-border" style={{ backgroundColor: branding.primaryColor }} aria-hidden="true" />
            </div>
            <p className="text-xs text-muted-foreground">{t('brandColorHint')}</p>
          </div>
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">{t('brandLogoHint')}</p>
            <div className="flex gap-2">
              <Button variant="outline" disabled={brandingSaving} onClick={handleSaveBranding}>
                {brandingSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                {t('saveBranding')}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
