'use client';

import React, { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Building2, CreditCard, Copy, Terminal, Github, Plus, Download, Trash2, Loader2, Upload, ShieldCheck, CheckCircle2, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { ThemeToggle } from '@/components/dashboard/theme-toggle';
import { RolesManager } from '@/components/dashboard/roles-manager';
import { setPushEnabled, getPushPermission, getPushState, subscribePushPermissionChanges, showBrowserNotification } from '@/lib/push';

export default function SettingsPage() {
  const t = useTranslations('settings');
  const tc = useTranslations('common');
  const { user } = useAuth();
  const { toast } = useToast();
  const [profileName, setProfileName] = useState('');
  const [profileEmail, setProfileEmail] = useState('');
  const [profileSaving, setProfileSaving] = useState(false);

  // Sync profile fields when user session hydrates
  useEffect(() => {
    if (user) {
      setProfileName(user.name || '');
      setProfileEmail(user.email || '');
    }
  }, [user]);
  const [billingLoading, setBillingLoading] = useState(false);
  const [githubLoading, setGithubLoading] = useState(false);
  const [logoUploading, setLogoUploading] = useState(false);
  const [alertSettings, setAlertSettings] = useState<Record<string, boolean>>({
    criticalViolations: true,
    weeklyDigest: true,
    scanCompleted: false,
    newFeatures: true
  });
  const [alertsSaving, setAlertsSaving] = useState(false);
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [maskedKey, setMaskedKey] = useState<string | null>(null);
  const [apiKeyLoading, setApiKeyLoading] = useState(false);
  const [usage, setUsage] = useState<{ websitesUsed: number; pagesScanned: number; scansRun: number; period: number } | null>(null);
  const [webhookUrl, setWebhookUrl] = useState('');
  const [webhookSaving, setWebhookSaving] = useState(false);
  const [couponCode, setCouponCode] = useState('');
  const [couponLoading, setCouponLoading] = useState(false);
  const [activeCoupon, setActiveCoupon] = useState<{ code: string; percentOff: number | null; description?: string } | null>(null);
  const [invoices, setInvoices] = useState<Array<{ id: string; number: string; amount: number; status: string; createdAt: string; url: string | null }>>([]);
  const [invoicesLoading, setInvoicesLoading] = useState(true);
  const [invoicesDemo, setInvoicesDemo] = useState(false);
  const [mfaEnabled, setMfaEnabled] = useState(false);
  const [mfaSetupQr, setMfaSetupQr] = useState<string | null>(null);
  const [mfaSetupCode, setMfaSetupCode] = useState('');
  const [mfaLoading, setMfaLoading] = useState(false);
  const [pushEnabled, setPushEnabledState] = useState(false);
  const [pushPermission, setPushPermission] = useState<string>('unsupported');
  const [branding, setBranding] = useState<{ displayName: string; primaryColor: string }>({ displayName: '', primaryColor: '#d94545' });
  const [brandingSaving, setBrandingSaving] = useState(false);
  const [currency, setCurrency] = useState('usd');
  const [currencySaving, setCurrencySaving] = useState(false);
  const [dataRegion, setDataRegion] = useState('us');
  const [regionSaving, setRegionSaving] = useState(false);
  const [orgExporting, setOrgExporting] = useState(false);

  useEffect(() => {
    setPushEnabledState(getPushState().effective);
    setPushPermission(getPushPermission());
    return subscribePushPermissionChanges(() => {
      setPushPermission(getPushPermission());
      setPushEnabledState(getPushState().effective);
    });
  }, []);

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
        toast({ title: t('mfaEnabled'), description: t('mfaEnabledMsg') });
      } else {
        toast({ title: t('invalidCode'), description: data.error || t('invalidCodeMsg'), variant: 'destructive' });
      }
    } catch {
      toast({ title: tc('error'), description: t('mfaEnableFailed'), variant: 'destructive' });
    } finally {
      setMfaLoading(false);
    }
  };

  const handleDisableMfa = async () => {
    if (!user?.id) return;
    const code = window.prompt(t('mfaDisablePrompt'));
    if (!code) return;
    setMfaLoading(true);
    try {
      const res = await fetch(`/api/auth/mfa/setup?userId=${encodeURIComponent(user.id)}&code=${encodeURIComponent(code)}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        setMfaEnabled(false);
        toast({ title: t('mfaDisabled'), description: t('mfaDisabledMsg') });
      } else {
        toast({ title: tc('error'), description: data.error || t('mfaDisableFailed'), variant: 'destructive' });
      }
    } catch {
      toast({ title: tc('error'), description: t('mfaDisableFailed'), variant: 'destructive' });
    } finally {
      setMfaLoading(false);
    }
  };

  useEffect(() => {
    if (!user?.orgId) return;
    fetch(`/api/settings?orgId=${encodeURIComponent(user.orgId)}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.data?.settings) {
          const settings = data.data.settings;
          if (settings.alerts) {
            setAlertSettings((prev) => ({ ...prev, ...settings.alerts }));
          }
          if (settings.slackWebhookUrl) {
            setWebhookUrl(settings.slackWebhookUrl);
          }
          if (settings.branding) {
            setBranding({
              displayName: settings.branding.displayName || '',
              primaryColor: settings.branding.primaryColor || '#d94545',
            });
          }
        }
      })
      .catch(() => {});
  }, [user?.orgId]);

  useEffect(() => {
    if (!user?.orgId) return;
    fetch(`/api/settings/api-key?orgId=${encodeURIComponent(user.orgId)}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.data?.maskedKey) {
          setMaskedKey(data.data.maskedKey);
        }
      })
      .catch(() => {});
  }, [user?.orgId]);

  useEffect(() => {
    if (!user?.orgId) return;
    fetch(`/api/stats/usage?orgId=${encodeURIComponent(user.orgId)}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setUsage(data.data);
        }
      })
      .catch(() => {});
  }, [user?.orgId]);

  useEffect(() => {
    fetch('/api/stripe/invoices')
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setInvoices(data.data || []);
          setInvoicesDemo(!!data.demo);
        }
      })
      .catch(() => {})
      .finally(() => setInvoicesLoading(false));
  }, []);

  useEffect(() => {
    fetch('/api/stripe/coupon')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.data) {
          setActiveCoupon(data.data);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetch('/api/billing/currency')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.data?.currency) {
          setCurrency(data.data.currency);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetch('/api/settings/region')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.dataRegion) {
          setDataRegion(data.dataRegion);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!user?.id) return;
    fetch(`/api/auth/mfa/setup?userId=${encodeURIComponent(user.id)}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.data?.qrDataUrl) {
          setMfaSetupQr(data.data.qrDataUrl);
        } else if (data.error === 'MFA is already enabled') {
          setMfaEnabled(true);
        }
      })
      .catch(() => {});
  }, [user?.id]);

  const handleRegenerateKey = async () => {
    if (!user?.orgId) return;
    setApiKeyLoading(true);
    try {
      const res = await fetch('/api/settings/api-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orgId: user.orgId }),
      });
      const data = await res.json();
      if (data.success) {
        setApiKey(data.data.apiKey);
        setMaskedKey(data.data.maskedKey);
        toast({ title: t('apiKeyGenerated'), description: t('apiKeyGeneratedMsg') });
      } else {
        toast({ title: tc('error'), description: data.error || t('keyGenerateFailed'), variant: 'destructive' });
      }
    } catch {
      toast({ title: tc('error'), description: t('keyGenerateFailed'), variant: 'destructive' });
    } finally {
      setApiKeyLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold">{t('title')}</h1>
        <p className="text-muted-foreground">{t('subtitle')}</p>
      </div>

      <Tabs defaultValue="profile">
        <TabsList className="grid w-full grid-cols-8">
          <TabsTrigger value="profile">{t('tabs.profile')}</TabsTrigger>
          <TabsTrigger value="team">{t('tabs.team')}</TabsTrigger>
          <TabsTrigger value="notifications">{t('tabs.alerts')}</TabsTrigger>
          <TabsTrigger value="billing">{t('tabs.billing')}</TabsTrigger>
          <TabsTrigger value="privacy">{t('tabs.privacy')}</TabsTrigger>
          <TabsTrigger value="api">{t('tabs.api')}</TabsTrigger>
          <TabsTrigger value="github">{t('tabs.github')}</TabsTrigger>
          <TabsTrigger value="appearance">{t('tabs.appearance')}</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-6 mt-6">
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
              <Button className="bg-coral hover:bg-coral/90 text-coral-foreground" disabled={profileSaving} onClick={async () => {
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
              }}>
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
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={logoUploading}
                    onClick={() => {
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
                    }}
                  >
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
                <Button variant="outline" disabled={billingLoading} onClick={async () => {
                  setBillingLoading(true);
                  try {
                    const res = await fetch('/api/stripe/checkout', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ orgId: user?.orgId, plan: 'growth', interval: 'monthly', email: user?.email }),
                    });
                    const data = await res.json();
                    if (data.success && data.data?.url) {
                      window.location.href = data.data.url;
                    } else {
                      toast({ title: tc('error'), description: data.error || t('checkoutFailed'), variant: 'destructive' });
                    }
                  } catch {
                    toast({ title: tc('error'), description: t('billingConnectFailed'), variant: 'destructive' });
                  } finally {
                    setBillingLoading(false);
                  }
                }}>{billingLoading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />{t('loading')}</> : t('upgrade')}</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="team" className="space-y-6 mt-6">
          <RolesManager />
        </TabsContent>

        <TabsContent value="notifications" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>{t('emailNotifications')}</CardTitle>
              <CardDescription>{t('emailNotificationsDesc')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                { key: 'criticalViolations', label: t('alertCritical'), description: t('alertCriticalDesc') },
                { key: 'weeklyDigest', label: t('alertWeekly'), description: t('alertWeeklyDesc') },
                { key: 'scanCompleted', label: t('alertScan'), description: t('alertScanDesc') },
                { key: 'newFeatures', label: t('alertFeatures'), description: t('alertFeaturesDesc') }
              ].map((item) => (
                <div key={item.key} className="flex items-center justify-between py-3 border-b border-border last:border-0">
                  <label htmlFor={`switch-${item.key}`} className="flex-1 cursor-pointer">
                    <p className="font-medium">{item.label}</p>
                    <p className="text-sm text-muted-foreground">{item.description}</p>
                  </label>
                  <Switch
                    id={`switch-${item.key}`}
                    checked={alertSettings[item.key] ?? true}
                    onCheckedChange={(checked) => setAlertSettings((prev) => ({ ...prev, [item.key]: checked }))}
                    aria-label={item.label}
                  />
                </div>
              ))}
              <div className="flex items-center justify-between pt-2">
                <p className="text-xs text-muted-foreground">{t('alertSavedHint')}</p>
                <Button
                  className="bg-coral hover:bg-coral/90 text-coral-foreground"
                  disabled={alertsSaving}
                  onClick={async () => {
                    setAlertsSaving(true);
                    try {
                      const res = await fetch('/api/settings', {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ orgId: user?.orgId, settings: { alerts: alertSettings } }),
                      });
                      const data = await res.json();
                      if (data.success) {
                        toast({ title: t('alertSettingsSaved'), description: t('alertSettingsSavedMsg') });
                      } else {
                        toast({ title: tc('error'), description: data.error || t('settingsSaveFailed'), variant: 'destructive' });
                      }
                    } catch {
                      toast({ title: tc('error'), description: t('settingsSaveFailed'), variant: 'destructive' });
                    } finally {
                      setAlertsSaving(false);
                    }
                  }}
                >
                  {alertsSaving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />{t('saving')}</> : t('saveAlertSettings')}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t('slackTeams')}</CardTitle>
              <CardDescription>{t('slackTeamsDesc')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="slack-webhook">{t('webhookUrl')}</Label>
                <Input
                  id="slack-webhook"
                  type="url"
                  placeholder={t('webhookPlaceholder')}
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrl(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  {t('webhookHint')}
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  className="bg-coral hover:bg-coral/90 text-coral-foreground"
                  disabled={webhookSaving}
                  onClick={async () => {
                    if (!webhookUrl.trim()) {
                      toast({ title: tc('error'), description: t('webhookRequired'), variant: 'destructive' });
                      return;
                    }
                    setWebhookSaving(true);
                    try {
                      const res = await fetch('/api/settings', {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ orgId: user?.orgId, settings: { slackWebhookUrl: webhookUrl } }),
                      });
                      const data = await res.json();
                      if (data.success) {
                        toast({ title: t('webhookSaved'), description: t('webhookSavedMsg') });
                      } else {
                        toast({ title: tc('error'), description: data.error || t('webhookSaveFailed'), variant: 'destructive' });
                      }
                    } catch {
                      toast({ title: tc('error'), description: t('webhookSaveFailed'), variant: 'destructive' });
                    } finally {
                      setWebhookSaving(false);
                    }
                  }}
                >
                  {webhookSaving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />{t('saving')}</> : t('saveWebhook')}
                </Button>
                <Button variant="outline" disabled={webhookSaving || !webhookUrl.trim()} onClick={async () => {
                  setWebhookSaving(true);
                  try {
                    const res = await fetch('/api/notifications/test', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ orgId: user?.orgId }),
                    });
                    const data = await res.json();
                    if (data.success) {
                      toast({ title: t('testSent'), description: t('testSentMsg') });
                    } else {
                      toast({ title: t('testFailed'), description: data.error || t('testFailedMsg'), variant: 'destructive' });
                    }
                  } catch {
                    toast({ title: tc('error'), description: t('testSendFailed'), variant: 'destructive' });
                  } finally {
                    setWebhookSaving(false);
                  }
                }}>
                  {t('sendTest')}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t('pushNotifications')}</CardTitle>
              <CardDescription>{t('pushNotificationsDesc')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between py-3">
                <div>
                  <p className="font-medium">{t('desktopNotifications')}</p>
                  <p className="text-sm text-muted-foreground">
                    {t('permissionStatus')} <strong>{pushPermission}</strong>
                    {pushPermission === 'granted' && pushEnabled && t('pushActive')}
                  </p>
                </div>
                <Switch
                  checked={pushEnabled}
                  onCheckedChange={async (checked) => {
                    const ok = await setPushEnabled(checked);
                    setPushPermission(getPushPermission());
                    setPushEnabledState(ok && getPushPermission() === 'granted');
                    if (!ok) {
                      toast({
                        title: t('notificationsBlocked'),
                        description: t('notificationsBlockedMsg'),
                        variant: 'destructive',
                      });
                    }
                  }}
                  aria-label={t('enablePushAria')}
                />
              </div>
              {pushPermission === 'denied' && (
                <p className="text-sm text-destructive">
                  {t('pushDeniedMsg')}
                </p>
              )}
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">
                  {t('pushTestHint')}
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!pushEnabled || pushPermission !== 'granted'}
                  onClick={() => {
                    showBrowserNotification('AccessGuard Test', { body: 'Browser push notifications are working!' });
                    toast({ title: t('testNotificationSent'), description: t('testNotificationSentMsg') });
                  }}
                >
                  {t('sendTestNotification')}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="billing" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>{t('currentPlan')}</CardTitle>
              <CardDescription>{t('manageSubscription')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 border border-border rounded-lg">
                <div>
                  <p className="font-medium">{t('growthPlan')}</p>
                  <p className="text-sm text-muted-foreground">{t('billedMonthly')}</p>
                </div>
                <Badge className="bg-emerald-700 text-white">{t('active')}</Badge>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 border border-border rounded-lg">
                  <p className="text-sm text-muted-foreground">{t('websites')}</p>
                  <p className="text-2xl font-bold">{usage?.websitesUsed ?? 0} <span className="text-sm font-normal text-muted-foreground">/ 10</span></p>
                </div>
                <div className="p-4 border border-border rounded-lg">
                  <p className="text-sm text-muted-foreground">{t('pagesScanned30d')}</p>
                  <p className="text-2xl font-bold">{usage?.pagesScanned?.toLocaleString() ?? 0} <span className="text-sm font-normal text-muted-foreground">/ 1,000</span></p>
                </div>
              </div>
              <div className="p-4 border border-border rounded-lg">
                <p className="text-sm text-muted-foreground">{t('scansRun30d')}</p>
                <p className="text-2xl font-bold">{usage?.scansRun ?? 0}</p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" disabled={billingLoading} onClick={async () => {
                  setBillingLoading(true);
                  try {
                    const res = await fetch('/api/stripe/cancel-subscription', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ immediately: false, reactivate: false }),
                    });
                    const data = await res.json();
                    if (data.success) {
                      toast({ title: t('canceled'), description: data.data?.message || t('canceledMsg') });
                    } else {
                      toast({ title: tc('error'), description: data.error || t('cancelFailed'), variant: 'destructive' });
                    }
                  } catch {
                    toast({ title: tc('error'), description: t('cancelFailedMsg'), variant: 'destructive' });
                  } finally {
                    setBillingLoading(false);
                  }
                }}>{t('cancelSubscription')}</Button>
                <Button className="bg-coral hover:bg-coral/90 text-coral-foreground" disabled={billingLoading} onClick={async () => {
                  setBillingLoading(true);
                  try {
                    const res = await fetch('/api/stripe/checkout', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ orgId: user?.orgId, plan: 'agency', interval: 'monthly', email: user?.email }),
                    });
                    const data = await res.json();
                    if (data.success && data.data?.url) {
                      window.location.href = data.data.url;
                    } else {
                      toast({ title: tc('error'), description: data.error || t('checkoutFailed'), variant: 'destructive' });
                    }
                  } catch {
                    toast({ title: tc('error'), description: t('billingConnectFailed'), variant: 'destructive' });
                  } finally {
                    setBillingLoading(false);
                  }
                }}>{billingLoading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />{t('loading')}</> : t('upgradePlan')}</Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t('billingCurrency')}</CardTitle>
              <CardDescription>{t('billingCurrencyDesc')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-end gap-3">
                <div className="grid gap-2 flex-1">
                  <Label htmlFor="billing-currency">{t('currency')}</Label>
                  <Select
                    value={currency}
                    onValueChange={setCurrency}
                    disabled={currencySaving}
                  >
                    <SelectTrigger id="billing-currency" className="w-full">
                      <SelectValue placeholder={t('selectCurrency')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="usd">{t('usd')}</SelectItem>
                      <SelectItem value="eur">{t('eur')}</SelectItem>
                      <SelectItem value="gbp">{t('gbp')}</SelectItem>
                      <SelectItem value="inr">{t('inr')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  variant="outline"
                  disabled={currencySaving}
                  onClick={async () => {
                    setCurrencySaving(true);
                    try {
                      const res = await fetch('/api/billing/currency', {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ currency }),
                      });
                      const data = await res.json();
                      if (data.success) {
                        toast({ title: t('currencyUpdated'), description: t('currencyUpdatedMsg', { code: data.data.currency.toUpperCase() }) });
                      } else {
                        toast({ title: tc('error'), description: data.error || t('currencyUpdateFailed'), variant: 'destructive' });
                      }
                    } catch {
                      toast({ title: tc('error'), description: t('currencyUpdateFailed'), variant: 'destructive' });
                    } finally {
                      setCurrencySaving(false);
                    }
                  }}
                >
                  {currencySaving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />{t('saving')}</> : t('saveCurrency')}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                {t('fxRatesHint')}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t('paymentMethod')}</CardTitle>
            </CardHeader>            <CardContent>
              <div className="flex items-center justify-between p-4 border border-border rounded-lg">
                <div className="flex items-center gap-3">
                  <CreditCard className="h-8 w-8 text-muted-foreground" />
                  <div>
                    <p className="font-medium">&bull;&bull;&bull;&bull; &bull;&bull;&bull;&bull; &bull;&bull;&bull;&bull; 4242</p>
                    <p className="text-sm text-muted-foreground">{t('expires')}</p>
                  </div>
                </div>
                <Button variant="outline" size="sm" disabled={billingLoading} onClick={async () => {
                  setBillingLoading(true);
                  try {
                    const res = await fetch('/api/stripe/checkout', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ orgId: user?.orgId, plan: 'growth', interval: 'monthly', email: user?.email }),
                    });
                    const data = await res.json();
                    if (data.success && data.data?.url) {
                      window.location.href = data.data.url;
                    } else {
                      toast({ title: tc('error'), description: t('stripePortalFailed'), variant: 'destructive' });
                    }
                  } catch {
                    toast({ title: tc('error'), description: t('stripeConnectFailed'), variant: 'destructive' });
                  } finally {
                    setBillingLoading(false);
                  }
                }}>{t('update')}</Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t('coupons')}</CardTitle>
              <CardDescription>{t('couponsDesc')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {activeCoupon ? (
                <div className="flex items-center justify-between p-4 border border-emerald-500/30 bg-emerald-500/5 rounded-lg">
                  <div>
                    <p className="font-medium text-emerald-500">{activeCoupon.code}</p>
                    <p className="text-sm text-muted-foreground">
                      {activeCoupon.percentOff != null ? t('percentOff', { percent: activeCoupon.percentOff }) : ''}
                      {' — '}{activeCoupon.description || t('couponApplied')}
                    </p>
                  </div>
                  <Badge variant="outline" className="border-emerald-500/30 text-emerald-500">{t('applied')}</Badge>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">{t('noCoupon')}</p>
              )}
              <div className="flex gap-2">
                <div className="grid gap-2 flex-1">
                  <Label htmlFor="coupon-code" className="sr-only">{t('couponCode')}</Label>
                  <Input
                    id="coupon-code"
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value)}
                    placeholder={t('couponPlaceholder')}
                    autoComplete="off"
                  />
                </div>
                <Button
                  variant="outline"
                  disabled={couponLoading || !couponCode.trim()}
                  onClick={async () => {
                    setCouponLoading(true);
                    try {
                      const res = await fetch('/api/stripe/coupon', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ code: couponCode.trim() }),
                      });
                      const data = await res.json();
                      if (data.success) {
                        toast({ title: t('couponAppliedTitle'), description: data.data.description });
                        setActiveCoupon(data.data);
                        setCouponCode('');
                      } else {
                        toast({ title: tc('error'), description: data.error || t('invalidCoupon'), variant: 'destructive' });
                      }
                    } catch {
                      toast({ title: tc('error'), description: t('couponApplyFailed'), variant: 'destructive' });
                    } finally {
                      setCouponLoading(false);
                    }
                  }}
                >
                  {couponLoading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />{t('applying')}</> : t('applyCoupon')}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t('invoices')}</CardTitle>
              <CardDescription>
                {t('invoicesDesc')}
                {invoicesDemo && <span className="ml-2 text-xs text-muted-foreground">{t('invoicesSample')}</span>}
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {invoicesLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : invoices.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">{t('noInvoices')}</p>
              ) : (
                <div className="divide-y divide-border">
                  {invoices.map((inv) => (
                    <div key={inv.id} className="flex items-center gap-4 p-4">
                      <div className="p-2.5 rounded-lg bg-muted">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-sm font-medium">{inv.number}</span>
                          <Badge variant="outline" className={`text-xs ${inv.status === 'paid' ? 'border-emerald-500/20 text-emerald-500' : inv.status === 'open' ? 'border-orange-500/20 text-orange-500' : ''}`}>
                            {inv.status}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">{new Date(inv.createdAt).toLocaleDateString()}</p>
                      </div>
                      <span className="text-sm font-medium">${(inv.amount / 100).toFixed(2)}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        aria-label={t('downloadInvoice')}
                        disabled={!inv.url}
                        onClick={() => inv.url && window.open(inv.url, '_blank', 'noopener,noreferrer')}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="privacy" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>{t('dataPrivacy')}</CardTitle>
              <CardDescription>{t('dataPrivacyDesc')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="font-medium mb-2 flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-coral" />
                  {t('mfaTitle')}
                </h3>
                <p className="text-sm text-muted-foreground mb-3">
                  {t('mfaDesc')}
                </p>
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
                    { }
                    <img src={mfaSetupQr} alt={t('mfaQrAlt')} className="rounded-lg border border-border" />
                    <div className="grid gap-2">
                      <Label htmlFor="mfa-code">{t('mfaCodeLabel')}</Label>
                      <div className="flex gap-2">
                        <Input
                          id="mfa-code"
                          type="text"
                          inputMode="numeric"
                          maxLength={6}
                          value={mfaSetupCode}
                          onChange={(e) => setMfaSetupCode(e.target.value.replace(/\D/g, ''))}
                          placeholder="123456"
                          className="text-center text-lg tracking-[0.3em] font-mono"
                        />
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

              <div>
                <h3 className="font-medium mb-2">{t('exportData')}</h3>
                <p className="text-sm text-muted-foreground mb-3">{t('exportDataDesc')}</p>
                <Button variant="outline" onClick={() => {
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
                }}>
                  <Download className="h-4 w-4 mr-2" />
                  {t('exportMyData')}
                </Button>
              </div>

              <div>
                <h3 className="font-medium mb-2">{t('orgExportTitle')}</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  {t('orgExportDesc')}
                </p>
                <Button variant="outline" disabled={orgExporting} onClick={async () => {
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
                }}>
                  {orgExporting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />{t('exporting')}</> : <><Download className="h-4 w-4 mr-2" />{t('exportOrgData')}</>}
                </Button>
              </div>

              <div className="border-t border-border pt-6">
                <h3 className="font-medium mb-2 flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-coral" />
                  {t('dataResidency')}
                </h3>
                <p className="text-sm text-muted-foreground mb-3">
                  {t('dataResidencyDesc')}
                </p>
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
                  <Button
                    variant="outline"
                    disabled={regionSaving}
                    onClick={async () => {
                      if (dataRegion === 'eu') {
                        const consent = window.confirm(t('euConsent'));
                        if (!consent) return;
                      }
                      setRegionSaving(true);
                      try {
                        const res = await fetch('/api/settings/region', {
                          method: 'PATCH',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ dataRegion }),
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
                    }}
                  >
                    {regionSaving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />{t('saving')}</> : t('saveRegion')}
                  </Button>
                </div>
              </div>

              <div className="border-t border-border pt-6">
                <h3 className="font-medium mb-2 text-destructive">{t('deleteAccount')}</h3>
                <p className="text-sm text-muted-foreground mb-3">{t('deleteAccountDesc')}</p>
                <Button variant="destructive" onClick={async () => {
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
                }}>
                  <Trash2 className="h-4 w-4 mr-2" />
                  {t('deleteAccount')}
                </Button>
              </div>

              <div className="border-t border-border pt-6">
                <h3 className="font-medium mb-2">{t('legalDocuments')}</h3>
                <div className="flex gap-3">
                  <Button variant="ghost" onClick={() => window.open('/api/legal/privacy', '_blank')}>
                    {t('privacyPolicy')}
                  </Button>
                  <Button variant="ghost" onClick={() => window.open('/api/legal/tos', '_blank')}>
                    {t('termsOfService')}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="api" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>{t('apiKeys')}</CardTitle>
              <CardDescription>{t('apiKeysDesc')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 border border-border rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <p className="font-medium">{t('productionKey')}</p>
                  {apiKey && (
                    <Button variant="ghost" size="sm" onClick={() => {
                      navigator.clipboard.writeText(apiKey).then(() => {
                        toast({ title: t('copied'), description: t('copiedMsg') });
                      });
                    }}>
                      <Copy className="h-4 w-4 mr-1" />
                      {t('copy')}
                    </Button>
                  )}
                </div>
                <code className="text-sm text-muted-foreground font-mono">
                  {apiKey ? maskedKey : t('noApiKey')}
                </code>
                <p className="text-xs text-muted-foreground mt-2">
                  {t('apiKeyHint1', { header: 'Authorization: Bearer' })}
                  {t('apiKeyHint2')}
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" disabled={apiKeyLoading} onClick={handleRegenerateKey}>
                  {apiKeyLoading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />{t('generating')}</> : apiKey ? t('regenerateKey') : t('generateKey')}
                </Button>
                <Button variant="outline" onClick={() => window.open('https://docs.accessguard.dev', '_blank', 'noopener,noreferrer')}>
                  <Terminal className="h-4 w-4 mr-2" />
                  {t('viewDocs')}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="github" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>{t('githubIntegration')}</CardTitle>
              <CardDescription>{t('githubIntegrationDesc')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 border border-border rounded-lg">
                <div className="flex items-center gap-3">
                  <Github className="h-8 w-8" />
                  <div>
                    <p className="font-medium">{t('connectedToGithub')}</p>
                    <p className="text-sm text-muted-foreground">{t('reposLinked', { count: 3 })}</p>
                  </div>
                </div>
                <Button variant="outline" size="sm" disabled={githubLoading} onClick={async () => {
                  setGithubLoading(true);
                  try {
                    const res = await fetch('/api/github/repos');
                    const data = await res.json();
                    if (data.success) {
                      const repos = data.data || [];
                      if (repos.length > 0) {
                        toast({ title: t('connected'), description: t('reposLinked', { count: repos.length }) });
                      } else {
                        toast({ title: t('noRepos'), description: t('connectGithub') });
                        window.location.href = '/api/github/connect';
                      }
                    } else {
                      toast({ title: tc('error'), description: t('reposFetchFailed'), variant: 'destructive' });
                    }
                  } catch {
                    toast({ title: tc('error'), description: t('githubNotConnected'), variant: 'destructive' });
                  } finally {
                    setGithubLoading(false);
                  }
                }}>{githubLoading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />{t('loading')}</> : t('manage')}</Button>
              </div>
              <Button className="bg-coral hover:bg-coral/90 text-coral-foreground" disabled={githubLoading} onClick={async () => {
                setGithubLoading(true);
                try {
                  window.location.href = '/api/github/connect';
                } finally {
                  setGithubLoading(false);
                }
              }}>
                {githubLoading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />{t('connecting')}</> : <><Plus className="h-4 w-4 mr-1" />{t('addRepository')}</>}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="appearance" className="space-y-6 mt-6">
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
                <Input
                  id="brand-name"
                  value={branding.displayName}
                  onChange={(e) => setBranding((prev) => ({ ...prev, displayName: e.target.value }))}
                  placeholder={t('displayNamePlaceholder')}
                  maxLength={60}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="brand-color">{t('primaryColor')}</Label>
                <div className="flex items-center gap-3">
                  <input
                    id="brand-color"
                    type="color"
                    value={branding.primaryColor}
                    onChange={(e) => setBranding((prev) => ({ ...prev, primaryColor: e.target.value }))}
                    className="h-10 w-14 rounded-md border border-border bg-transparent cursor-pointer"
                    aria-label={t('brandColorAria')}
                  />
                  <Input
                    value={branding.primaryColor}
                    onChange={(e) => setBranding((prev) => ({ ...prev, primaryColor: e.target.value }))}
                    className="w-32 font-mono text-sm"
                    aria-label={t('brandColorHexAria')}
                    maxLength={7}
                  />
                  <div
                    className="h-10 w-10 rounded-md border border-border"
                    style={{ backgroundColor: branding.primaryColor }}
                    aria-hidden="true"
                  />
                </div>
                <p className="text-xs text-muted-foreground">{t('brandColorHint')}</p>
              </div>
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">
                  {t('brandLogoHint')}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    disabled={brandingSaving}
                    onClick={async () => {
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
                    }}
                  >
                    {brandingSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                    {t('saveBranding')}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
