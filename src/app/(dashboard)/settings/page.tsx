'use client';

import { useTranslations } from 'next-intl';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RolesManager } from '@/components/dashboard/roles-manager';
import { ProfileSettings } from '@/components/settings/profile-settings';
import { NotificationSettings } from '@/components/settings/notification-settings';
import { BillingSettings } from '@/components/settings/billing-settings';
import { PrivacySettings } from '@/components/settings/privacy-settings';
import { ApiKeySettings } from '@/components/settings/api-key-settings';
import { GitHubSettings } from '@/components/settings/github-settings';
import { AppearanceSettings } from '@/components/settings/appearance-settings';

export default function SettingsPage() {
  const t = useTranslations('settings');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t('title')}</h1>
        <p className="text-muted-foreground">{t('subtitle')}</p>
      </div>

      <Tabs defaultValue="profile">
        <TabsList className="flex-wrap">
          <TabsTrigger value="profile">{t('tabs.profile')}</TabsTrigger>
          <TabsTrigger value="team">{t('tabs.team')}</TabsTrigger>
          <TabsTrigger value="notifications">{t('tabs.alerts')}</TabsTrigger>
          <TabsTrigger value="billing">{t('tabs.billing')}</TabsTrigger>
          <TabsTrigger value="privacy">{t('tabs.privacy')}</TabsTrigger>
          <TabsTrigger value="api">{t('tabs.api')}</TabsTrigger>
          <TabsTrigger value="github">{t('tabs.github')}</TabsTrigger>
          <TabsTrigger value="appearance">{t('tabs.appearance')}</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="mt-6">
          <ProfileSettings billingLoading={false} onCheckout={() => {}} />
        </TabsContent>

        <TabsContent value="team" className="mt-6">
          <RolesManager />
        </TabsContent>

        <TabsContent value="notifications" className="mt-6">
          <NotificationSettings />
        </TabsContent>

        <TabsContent value="billing" className="mt-6">
          <BillingSettings />
        </TabsContent>

        <TabsContent value="privacy" className="mt-6">
          <PrivacySettings />
        </TabsContent>

        <TabsContent value="api" className="mt-6">
          <ApiKeySettings />
        </TabsContent>

        <TabsContent value="github" className="mt-6">
          <GitHubSettings />
        </TabsContent>

        <TabsContent value="appearance" className="mt-6">
          <AppearanceSettings />
        </TabsContent>
      </Tabs>
    </div>
  );
}
