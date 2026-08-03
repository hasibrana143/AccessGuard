'use client';

import React, { useState, useEffect } from 'react';
import { Building2, CreditCard, Copy, Terminal, Github, Plus, Download, Trash2, Loader2, Upload, ShieldCheck, CheckCircle2, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { ThemeToggle } from '@/components/dashboard/theme-toggle';
import { RolesManager } from '@/components/dashboard/roles-manager';
import { isPushEnabled, setPushEnabled, getPushPermission, showBrowserNotification } from '@/lib/push';

export default function SettingsPage() {
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

  useEffect(() => {
    setPushEnabledState(isPushEnabled());
    setPushPermission(getPushPermission());
  }, []);

  const handleSetupMfa = async () => {
    if (!user?.id) return;
    setMfaLoading(true);
    try {
      const res = await fetch(`/api/auth/mfa/setup?userId=${encodeURIComponent(user.id)}&email=${encodeURIComponent(user.email)}`);
      const data = await res.json();
      if (data.success) {
        setMfaSetupQr(data.data.qrDataUrl);
        toast({ title: 'Scan the QR Code', description: 'Use your authenticator app to scan and enter the 6-digit code.' });
      } else {
        toast({ title: 'Error', description: data.error || 'Failed to start setup', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to start setup', variant: 'destructive' });
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
        toast({ title: 'MFA Enabled', description: 'Your account is now protected with two-factor authentication.' });
      } else {
        toast({ title: 'Invalid Code', description: data.error || 'Check your authenticator app and try again', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to enable MFA', variant: 'destructive' });
    } finally {
      setMfaLoading(false);
    }
  };

  const handleDisableMfa = async () => {
    if (!user?.id) return;
    setMfaLoading(true);
    try {
      const res = await fetch(`/api/auth/mfa/setup?userId=${encodeURIComponent(user.id)}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        setMfaEnabled(false);
        toast({ title: 'MFA Disabled', description: 'Two-factor authentication has been turned off.' });
      } else {
        toast({ title: 'Error', description: data.error || 'Failed to disable MFA', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to disable MFA', variant: 'destructive' });
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
        toast({ title: 'API Key Generated', description: 'Your new API key is ready. Copy it now — it is only shown once.' });
      } else {
        toast({ title: 'Error', description: data.error || 'Failed to generate key', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to generate key', variant: 'destructive' });
    } finally {
      setApiKeyLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground">Manage your account and preferences</p>
      </div>

      <Tabs defaultValue="profile">
        <TabsList className="grid w-full grid-cols-8">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="team">Team</TabsTrigger>
          <TabsTrigger value="notifications">Alerts</TabsTrigger>
          <TabsTrigger value="billing">Billing</TabsTrigger>
          <TabsTrigger value="privacy">Privacy</TabsTrigger>
          <TabsTrigger value="api">API</TabsTrigger>
          <TabsTrigger value="github">GitHub</TabsTrigger>
          <TabsTrigger value="appearance">Appearance</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
              <CardDescription>Update your account details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="profile-name">Name</Label>
                <Input id="profile-name" value={profileName} onChange={(e) => setProfileName(e.target.value)} placeholder="Your name" autoComplete="name" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="profile-email">Email</Label>
                <Input id="profile-email" value={profileEmail} onChange={(e) => setProfileEmail(e.target.value)} placeholder="your@email.com" autoComplete="email" />
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
                    toast({ title: 'Saved', description: 'Profile updated successfully' });
                  } else {
                    toast({ title: 'Error', description: data.error || 'Failed to save', variant: 'destructive' });
                  }
                } catch {
                  toast({ title: 'Error', description: 'Failed to save profile', variant: 'destructive' });
                } finally {
                  setProfileSaving(false);
                }
              }}>
                {profileSaving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving...</> : 'Save Changes'}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Organization</CardTitle>
              <CardDescription>Manage your organization settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="org-name">Organization Name</Label>
                <Input id="org-name" defaultValue={user?.orgName || ''} placeholder="Organization name" autoComplete="organization" />
              </div>
              <div className="grid gap-2">
                <Label>Organization Logo</Label>
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
                              toast({ title: 'Logo Uploaded', description: 'Organization logo saved. It will appear on PDF reports.' });
                            } else {
                              toast({ title: 'Error', description: data.error || 'Failed to upload logo', variant: 'destructive' });
                            }
                          };
                          reader.readAsDataURL(file);
                        } catch {
                          toast({ title: 'Error', description: 'Failed to upload logo', variant: 'destructive' });
                        } finally {
                          setLogoUploading(false);
                        }
                      };
                      input.click();
                    }}
                  >
                    {logoUploading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
                    Upload Logo
                  </Button>
                  <span className="text-xs text-muted-foreground">PNG, JPG or SVG. Will appear on PDF reports.</span>
                </div>
              </div>
              <div className="flex items-center justify-between p-4 border border-border rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-coral/10">
                    <Building2 className="h-5 w-5 text-coral" />
                  </div>
                  <div>
                    <p className="font-medium">Growth Plan</p>
                    <p className="text-sm text-muted-foreground">Manage your subscription</p>
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
                      toast({ title: 'Error', description: data.error || 'Failed to create checkout', variant: 'destructive' });
                    }
                  } catch {
                    toast({ title: 'Error', description: 'Failed to connect to billing', variant: 'destructive' });
                  } finally {
                    setBillingLoading(false);
                  }
                }}>{billingLoading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Loading...</> : 'Upgrade'}</Button>
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
              <CardTitle>Email Notifications</CardTitle>
              <CardDescription>Choose what notifications you receive</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                { key: 'criticalViolations', label: 'Critical violations detected', description: 'Get notified when critical issues are found' },
                { key: 'weeklyDigest', label: 'Weekly digest', description: 'Receive a weekly summary of your compliance status' },
                { key: 'scanCompleted', label: 'Scan completed', description: 'Get notified when a scan finishes' },
                { key: 'newFeatures', label: 'New features', description: 'Learn about new AccessGuard features' }
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
                <p className="text-xs text-muted-foreground">Changes are saved to your organization settings.</p>
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
                        toast({ title: 'Alert Settings Saved', description: 'Notification preferences updated.' });
                      } else {
                        toast({ title: 'Error', description: data.error || 'Failed to save settings', variant: 'destructive' });
                      }
                    } catch {
                      toast({ title: 'Error', description: 'Failed to save settings', variant: 'destructive' });
                    } finally {
                      setAlertsSaving(false);
                    }
                  }}
                >
                  {alertsSaving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving...</> : 'Save Alert Settings'}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Slack / Microsoft Teams</CardTitle>
              <CardDescription>Send scan alerts to your team channel</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="slack-webhook">Incoming Webhook URL</Label>
                <Input
                  id="slack-webhook"
                  type="url"
                  placeholder="https://hooks.slack.com/services/... or Teams webhook URL"
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrl(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Create a Slack Incoming Webhook or Teams incoming webhook and paste the URL here.
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  className="bg-coral hover:bg-coral/90 text-coral-foreground"
                  disabled={webhookSaving}
                  onClick={async () => {
                    if (!webhookUrl.trim()) {
                      toast({ title: 'Error', description: 'Enter a webhook URL first', variant: 'destructive' });
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
                        toast({ title: 'Webhook Saved', description: 'Channel notifications enabled' });
                      } else {
                        toast({ title: 'Error', description: data.error || 'Failed to save webhook', variant: 'destructive' });
                      }
                    } catch {
                      toast({ title: 'Error', description: 'Failed to save webhook', variant: 'destructive' });
                    } finally {
                      setWebhookSaving(false);
                    }
                  }}
                >
                  {webhookSaving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving...</> : 'Save Webhook'}
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
                      toast({ title: 'Test Sent', description: 'Check your channel for the test message' });
                    } else {
                      toast({ title: 'Failed', description: data.error || 'Could not send test message', variant: 'destructive' });
                    }
                  } catch {
                    toast({ title: 'Error', description: 'Failed to send test message', variant: 'destructive' });
                  } finally {
                    setWebhookSaving(false);
                  }
                }}>
                  Send Test
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Browser Push Notifications</CardTitle>
              <CardDescription>Get desktop notifications when scans complete</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between py-3">
                <div>
                  <p className="font-medium">Desktop notifications</p>
                  <p className="text-sm text-muted-foreground">
                    Permission status: <strong>{pushPermission}</strong>
                    {pushPermission === 'granted' && pushEnabled && ' • Notifications will appear when scans complete'}
                  </p>
                </div>
                <Switch
                  checked={pushEnabled}
                  onCheckedChange={(checked) => {
                    const ok = setPushEnabled(checked);
                    setPushEnabledState(checked && getPushPermission() !== 'unsupported');
                    setPushPermission(getPushPermission());
                    if (!ok) {
                      toast({ title: 'Error', description: 'Could not save preference', variant: 'destructive' });
                    }
                  }}
                  aria-label="Enable browser push notifications"
                />
              </div>
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">
                  Test that browser notifications work on this device.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!pushEnabled || pushPermission !== 'granted'}
                  onClick={() => {
                    showBrowserNotification('AccessGuard Test', { body: 'Browser push notifications are working!' });
                    toast({ title: 'Test Notification Sent', description: 'Check your desktop for the notification' });
                  }}
                >
                  Send Test Notification
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="billing" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Current Plan</CardTitle>
              <CardDescription>Manage your subscription</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 border border-border rounded-lg">
                <div>
                  <p className="font-medium">Growth Plan</p>
                  <p className="text-sm text-muted-foreground">$149/month • Billed monthly</p>
                </div>
                <Badge className="bg-emerald-700 text-white">Active</Badge>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 border border-border rounded-lg">
                  <p className="text-sm text-muted-foreground">Websites</p>
                  <p className="text-2xl font-bold">{usage?.websitesUsed ?? 0} <span className="text-sm font-normal text-muted-foreground">/ 10</span></p>
                </div>
                <div className="p-4 border border-border rounded-lg">
                  <p className="text-sm text-muted-foreground">Pages Scanned (30d)</p>
                  <p className="text-2xl font-bold">{usage?.pagesScanned?.toLocaleString() ?? 0} <span className="text-sm font-normal text-muted-foreground">/ 1,000</span></p>
                </div>
              </div>
              <div className="p-4 border border-border rounded-lg">
                <p className="text-sm text-muted-foreground">Scans Run (30d)</p>
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
                      toast({ title: 'Canceled', description: data.data?.message || 'Subscription will cancel at period end' });
                    } else {
                      toast({ title: 'Error', description: data.error || 'Failed to cancel', variant: 'destructive' });
                    }
                  } catch {
                    toast({ title: 'Error', description: 'Failed to cancel subscription', variant: 'destructive' });
                  } finally {
                    setBillingLoading(false);
                  }
                }}>Cancel Subscription</Button>
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
                      toast({ title: 'Error', description: data.error || 'Failed to create checkout', variant: 'destructive' });
                    }
                  } catch {
                    toast({ title: 'Error', description: 'Failed to connect to billing', variant: 'destructive' });
                  } finally {
                    setBillingLoading(false);
                  }
                }}>{billingLoading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Loading...</> : 'Upgrade Plan'}</Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Payment Method</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between p-4 border border-border rounded-lg">
                <div className="flex items-center gap-3">
                  <CreditCard className="h-8 w-8 text-muted-foreground" />
                  <div>
                    <p className="font-medium">&bull;&bull;&bull;&bull; &bull;&bull;&bull;&bull; &bull;&bull;&bull;&bull; 4242</p>
                    <p className="text-sm text-muted-foreground">Expires 12/2025</p>
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
                      toast({ title: 'Error', description: 'Update payment from Stripe portal', variant: 'destructive' });
                    }
                  } catch {
                    toast({ title: 'Error', description: 'Failed to connect to Stripe', variant: 'destructive' });
                  } finally {
                    setBillingLoading(false);
                  }
                }}>Update</Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Coupons</CardTitle>
              <CardDescription>Apply a discount coupon to your subscription</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {activeCoupon ? (
                <div className="flex items-center justify-between p-4 border border-emerald-500/30 bg-emerald-500/5 rounded-lg">
                  <div>
                    <p className="font-medium text-emerald-600 dark:text-emerald-400">{activeCoupon.code}</p>
                    <p className="text-sm text-muted-foreground">
                      {activeCoupon.percentOff != null ? `${activeCoupon.percentOff}% off` : ''}
                      {' — '}{activeCoupon.description || 'Coupon applied'}
                    </p>
                  </div>
                  <Badge variant="outline" className="border-emerald-500/30 text-emerald-500">Applied</Badge>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No coupon applied.</p>
              )}
              <div className="flex gap-2">
                <div className="grid gap-2 flex-1">
                  <Label htmlFor="coupon-code" className="sr-only">Coupon code</Label>
                  <Input
                    id="coupon-code"
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value)}
                    placeholder="Enter coupon code (e.g. WELCOME20)"
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
                        toast({ title: 'Coupon Applied', description: data.data.description });
                        setActiveCoupon(data.data);
                        setCouponCode('');
                      } else {
                        toast({ title: 'Error', description: data.error || 'Invalid coupon', variant: 'destructive' });
                      }
                    } catch {
                      toast({ title: 'Error', description: 'Failed to apply coupon', variant: 'destructive' });
                    } finally {
                      setCouponLoading(false);
                    }
                  }}
                >
                  {couponLoading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Applying...</> : 'Apply Coupon'}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Invoices</CardTitle>
              <CardDescription>
                Recent billing invoices
                {invoicesDemo && <span className="ml-2 text-xs text-muted-foreground">(sample data — Stripe not connected)</span>}
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {invoicesLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : invoices.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No invoices found</p>
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
              <CardTitle>Data & Privacy</CardTitle>
              <CardDescription>Manage your data and account</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="font-medium mb-2 flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-coral" />
                  Two-Factor Authentication (MFA)
                </h3>
                <p className="text-sm text-muted-foreground mb-3">
                  Add an extra layer of security using any authenticator app (Google Authenticator, Authy, 1Password).
                </p>
                {mfaEnabled ? (
                  <div className="flex flex-col gap-3">
                    <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 self-start">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      MFA Enabled
                    </Badge>
                    <Button variant="outline" className="text-destructive" disabled={mfaLoading} onClick={handleDisableMfa}>
                      {mfaLoading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Disabling...</> : 'Disable MFA'}
                    </Button>
                  </div>
                ) : mfaSetupQr ? (
                  <div className="flex flex-col gap-3 max-w-xs">
                    { }
                    <img src={mfaSetupQr} alt="Scan with your authenticator app" className="rounded-lg border border-border" />
                    <div className="grid gap-2">
                      <Label htmlFor="mfa-code">Enter 6-digit code from your app</Label>
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
                          {mfaLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Enable'}
                        </Button>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => setMfaSetupQr(null)}>Cancel</Button>
                  </div>
                ) : (
                  <Button variant="outline" disabled={mfaLoading} onClick={handleSetupMfa}>
                    {mfaLoading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Preparing...</> : 'Set Up MFA'}
                  </Button>
                )}
              </div>

              <div>
                <h3 className="font-medium mb-2">Export Your Data</h3>
                <p className="text-sm text-muted-foreground mb-3">Download all your account data in JSON format</p>
                <Button variant="outline" onClick={() => {
                  fetch('/api/account/export').then(async (res) => {
                    if (!res.ok) throw new Error('Export failed');
                    const blob = await res.blob();
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `accessguard-export-${new Date().toISOString().split('T')[0]}.json`;
                    a.click();
                    URL.revokeObjectURL(url);
                    toast({ title: 'Export complete', description: 'Your data has been downloaded' });
                  }).catch(() => toast({ title: 'Export failed', description: 'Please try again later', variant: 'destructive' }));
                }}>
                  <Download className="h-4 w-4 mr-2" />
                  Export Data
                </Button>
              </div>

              <div className="border-t border-border pt-6">
                <h3 className="font-medium mb-2 text-destructive">Delete Account</h3>
                <p className="text-sm text-muted-foreground mb-3">Permanently delete your account and all associated data. This action cannot be undone.</p>
                <Button variant="destructive" onClick={async () => {
                  const confirmed = window.prompt('Type "DELETE MY ACCOUNT" to confirm');
                  if (confirmed !== 'DELETE MY ACCOUNT') {
                    toast({ title: 'Cancelled', description: 'Type DELETE MY ACCOUNT to confirm' });
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
                      toast({ title: 'Account deleted', description: 'Redirecting...' });
                      window.location.href = '/';
                    } else {
                      toast({ title: 'Failed', description: data.error || 'Please try again', variant: 'destructive' });
                    }
                  } catch {
                    toast({ title: 'Error', description: 'Failed to delete account', variant: 'destructive' });
                  }
                }}>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Account
                </Button>
              </div>

              <div className="border-t border-border pt-6">
                <h3 className="font-medium mb-2">Legal Documents</h3>
                <div className="flex gap-3">
                  <Button variant="ghost" onClick={() => window.open('/api/legal/privacy', '_blank')}>
                    Privacy Policy
                  </Button>
                  <Button variant="ghost" onClick={() => window.open('/api/legal/tos', '_blank')}>
                    Terms of Service
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="api" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>API Keys</CardTitle>
              <CardDescription>Manage API keys for integrations</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 border border-border rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <p className="font-medium">Production Key</p>
                  {apiKey && (
                    <Button variant="ghost" size="sm" onClick={() => {
                      navigator.clipboard.writeText(apiKey).then(() => {
                        toast({ title: 'Copied', description: 'API key copied to clipboard' });
                      });
                    }}>
                      <Copy className="h-4 w-4 mr-1" />
                      Copy
                    </Button>
                  )}
                </div>
                <code className="text-sm text-muted-foreground font-mono">
                  {apiKey ? maskedKey : 'No API key generated yet'}
                </code>
                <p className="text-xs text-muted-foreground mt-2">
                  Use this key in the <code className="font-mono">Authorization: Bearer</code> header of API requests.
                  It is stored encrypted in your organization settings.
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" disabled={apiKeyLoading} onClick={handleRegenerateKey}>
                  {apiKeyLoading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Generating...</> : apiKey ? 'Regenerate Key' : 'Generate Key'}
                </Button>
                <Button variant="outline" onClick={() => window.open('https://docs.accessguard.dev', '_blank', 'noopener,noreferrer')}>
                  <Terminal className="h-4 w-4 mr-2" />
                  View Documentation
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="github" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>GitHub Integration</CardTitle>
              <CardDescription>Connect to GitHub for automated PRs</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 border border-border rounded-lg">
                <div className="flex items-center gap-3">
                  <Github className="h-8 w-8" />
                  <div>
                    <p className="font-medium">Connected to GitHub</p>
                    <p className="text-sm text-muted-foreground">3 repositories linked</p>
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
                        toast({ title: 'Connected', description: `${repos.length} repositories linked` });
                      } else {
                        toast({ title: 'No repos', description: 'Connect GitHub to see repositories' });
                        window.location.href = '/api/github/connect';
                      }
                    } else {
                      toast({ title: 'Error', description: 'Failed to fetch repos', variant: 'destructive' });
                    }
                  } catch {
                    toast({ title: 'Error', description: 'GitHub not connected', variant: 'destructive' });
                  } finally {
                    setGithubLoading(false);
                  }
                }}>{githubLoading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Loading...</> : 'Manage'}</Button>
              </div>
              <Button className="bg-coral hover:bg-coral/90 text-coral-foreground" disabled={githubLoading} onClick={async () => {
                setGithubLoading(true);
                try {
                  window.location.href = '/api/github/connect';
                } finally {
                  setGithubLoading(false);
                }
              }}>
                {githubLoading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Connecting...</> : <><Plus className="h-4 w-4 mr-1" />Add Repository</>}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="appearance" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Appearance</CardTitle>
              <CardDescription>Choose how AccessGuard looks</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Theme</p>
                  <p className="text-sm text-muted-foreground">Switch between dark and light mode</p>
                </div>
                <ThemeToggle />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Branding</CardTitle>
              <CardDescription>White-label AccessGuard for your organization (logo is set in the Organization section)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="brand-name">Display name</Label>
                <Input
                  id="brand-name"
                  value={branding.displayName}
                  onChange={(e) => setBranding((prev) => ({ ...prev, displayName: e.target.value }))}
                  placeholder="Shown next to the logo in the dashboard header"
                  maxLength={60}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="brand-color">Primary color</Label>
                <div className="flex items-center gap-3">
                  <input
                    id="brand-color"
                    type="color"
                    value={branding.primaryColor}
                    onChange={(e) => setBranding((prev) => ({ ...prev, primaryColor: e.target.value }))}
                    className="h-10 w-14 rounded-md border border-border bg-transparent cursor-pointer"
                    aria-label="Primary brand color"
                  />
                  <Input
                    value={branding.primaryColor}
                    onChange={(e) => setBranding((prev) => ({ ...prev, primaryColor: e.target.value }))}
                    className="w-32 font-mono text-sm"
                    aria-label="Primary brand color hex value"
                    maxLength={7}
                  />
                  <div
                    className="h-10 w-10 rounded-md border border-border"
                    style={{ backgroundColor: branding.primaryColor }}
                    aria-hidden="true"
                  />
                </div>
                <p className="text-xs text-muted-foreground">Applied to buttons and accents in the dashboard after saving.</p>
              </div>
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">
                  A logo uploaded in the Organization section also appears in the header and on PDF reports.
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
                          toast({ title: 'Branding Saved', description: 'Your organization branding is now applied.' });
                        } else {
                          toast({ title: 'Error', description: data.error || 'Failed to save branding', variant: 'destructive' });
                        }
                      } catch {
                        toast({ title: 'Error', description: 'Failed to save branding', variant: 'destructive' });
                      } finally {
                        setBrandingSaving(false);
                      }
                    }}
                  >
                    {brandingSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                    Save Branding
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
