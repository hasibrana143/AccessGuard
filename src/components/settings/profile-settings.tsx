'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Building2, Upload, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import type { User } from '@/types';

interface ProfileSettingsProps {
  billingLoading: boolean;
  onCheckout: (plan: string) => void;
}

export function ProfileSettings({ billingLoading, onCheckout }: ProfileSettingsProps) {
  const t = useTranslations('settings');
  const tc = useTranslations('common');
  const { user } = useAuth();
  const { toast } = useToast();
  const [profileName, setProfileName] = useState('');
  const [profileEmail, setProfileEmail] = useState('');
  const [profileSaving, setProfileSaving] = useState(false);
  const [logoUploading, setLogoUploading] = useState(false);

  useEffect(() => {
    if (user) {
      setProfileName(user.name || '');
      setProfileEmail(user.email || '');
    }
  }, [user]);

  const handleSaveProfile = async () => {
    setProfileSaving(true);
    try {
      const res = await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orgId: user?.orgId, settings: { name: profileName, email: profileEmail } }),
      });
      const data = await res.json();
      if (data.success) {
        toast({ title: t('saved'), description: t('profileUpdatedMsg') });
      } else {
        toast({ title: tc('error'), description: data.error || t('saveFailed'), variant: 'destructive' });
      }
    } catch {
      toast({ title: tc('error'), description: t('profileSaveFailed'), variant: 'destructive' });
    } finally {
      setProfileSaving(false);
    }
  };

  const handleLogoUpload = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      setLogoUploading(true);
      try {
        const reader = new FileReader();
        reader.onloadend = async () => {
          const base64 = reader.result as string;
          const res = await fetch('/api/settings', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ orgId: user?.orgId, settings: { logoUrl: base64 } }),
          });
          const data = await res.json();
          if (data.success) {
            toast({ title: t('logoUploaded'), description: t('logoUploadedMsg') });
          } else {
            toast({ title: tc('error'), description: data.error || t('logoUploadFailed'), variant: 'destructive' });
          }
        };
        reader.readAsDataURL(file);
      } catch {
        toast({ title: tc('error'), description: t('logoUploadFailed'), variant: 'destructive' });
      } finally {
        setLogoUploading(false);
      }
    };
    input.click();
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{t('profileInfo')}</CardTitle>
          <CardDescription>{t('profileInfoDesc')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="profile-name">{t('name')}</Label>
            <Input id="profile-name" value={profileName} onChange={(e) => setProfileName(e.target.value)} placeholder={t('namePlaceholder')} autoComplete="name" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="profile-email">{t('email')}</Label>
            <Input id="profile-email" value={profileEmail} onChange={(e) => setProfileEmail(e.target.value)} placeholder={t('emailPlaceholder')} autoComplete="email" />
          </div>
          <Button className="bg-coral hover:bg-coral/90 text-coral-foreground" disabled={profileSaving} onClick={handleSaveProfile}>
            {profileSaving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />{t('saving')}</> : t('saveChanges')}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('organization')}</CardTitle>
          <CardDescription>{t('orgDesc')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="org-name">{t('orgName')}</Label>
            <Input id="org-name" defaultValue={user?.orgName || ''} placeholder={t('orgNamePlaceholder')} autoComplete="organization" />
          </div>
          <div className="grid gap-2">
            <Label>{t('orgLogo')}</Label>
            <div className="flex items-center gap-4">
              <Button variant="outline" size="sm" disabled={logoUploading} onClick={handleLogoUpload}>
                {logoUploading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
                {t('uploadLogo')}
              </Button>
              <span className="text-xs text-muted-foreground">{t('logoHint')}</span>
            </div>
          </div>
          <div className="flex items-center justify-between p-4 border border-border rounded-lg">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-coral/10">
                <Building2 className="h-5 w-5 text-coral" />
              </div>
              <div>
                <p className="font-medium">{t('growthPlan')}</p>
                <p className="text-sm text-muted-foreground">{t('manageSubscription')}</p>
              </div>
            </div>
            <Button variant="outline" disabled={billingLoading} onClick={() => onCheckout('growth')}>
              {billingLoading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />{t('loading')}</> : t('upgrade')}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
