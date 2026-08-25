'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { setPushEnabled, getPushPermission, getPushState, subscribePushPermissionChanges, showBrowserNotification } from '@/lib/push';

export function NotificationSettings() {
  const t = useTranslations('settings');
  const tc = useTranslations('common');
  const { user } = useAuth();
  const { toast } = useToast();

  const [alertSettings, setAlertSettings] = useState<Record<string, boolean>>({
    criticalViolations: true,
    weeklyDigest: true,
    scanCompleted: false,
    newFeatures: true,
  });
  const [alertsSaving, setAlertsSaving] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState('');
  const [webhookSaving, setWebhookSaving] = useState(false);
  const [pushEnabled, setPushEnabledState] = useState(false);
  const [pushPermission, setPushPermission] = useState<string>('unsupported');

  useEffect(() => {
    setPushEnabledState(getPushState().effective);
    setPushPermission(getPushPermission());
    return subscribePushPermissionChanges(() => {
      setPushPermission(getPushPermission());
      setPushEnabledState(getPushState().effective);
    });
  }, []);

  const handleSaveAlerts = async () => {
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
  };

  const handleSaveWebhook = async () => {
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
  };

  const handleTestWebhook = async () => {
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
  };

  const alertItems = [
    { key: 'criticalViolations', label: t('alertCritical'), description: t('alertCriticalDesc') },
    { key: 'weeklyDigest', label: t('alertWeekly'), description: t('alertWeeklyDesc') },
    { key: 'scanCompleted', label: t('alertScan'), description: t('alertScanDesc') },
    { key: 'newFeatures', label: t('alertFeatures'), description: t('alertFeaturesDesc') },
  ];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{t('emailNotifications')}</CardTitle>
          <CardDescription>{t('emailNotificationsDesc')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {alertItems.map((item) => (
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
            <Button className="bg-coral hover:bg-coral/90 text-coral-foreground" disabled={alertsSaving} onClick={handleSaveAlerts}>
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
            <Input id="slack-webhook" type="url" placeholder={t('webhookPlaceholder')} value={webhookUrl} onChange={(e) => setWebhookUrl(e.target.value)} />
            <p className="text-xs text-muted-foreground">{t('webhookHint')}</p>
          </div>
          <div className="flex gap-2">
            <Button className="bg-coral hover:bg-coral/90 text-coral-foreground" disabled={webhookSaving} onClick={handleSaveWebhook}>
              {webhookSaving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />{t('saving')}</> : t('saveWebhook')}
            </Button>
            <Button variant="outline" disabled={webhookSaving || !webhookUrl.trim()} onClick={handleTestWebhook}>
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
                  toast({ title: t('notificationsBlocked'), description: t('notificationsBlockedMsg'), variant: 'destructive' });
                }
              }}
              aria-label={t('enablePushAria')}
            />
          </div>
          {pushPermission === 'denied' && (
            <p className="text-sm text-destructive">{t('pushDeniedMsg')}</p>
          )}
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">{t('pushTestHint')}</p>
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
    </div>
  );
}
