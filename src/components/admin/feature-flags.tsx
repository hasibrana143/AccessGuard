'use client';

import { useTranslations } from 'next-intl';
import { ScrollText } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';

interface FeatureFlagsProps {
  flags: Record<string, boolean>;
  flagUpdating: string | null;
  onToggle: (flag: string, enabled: boolean) => void;
}

export function FeatureFlags({ flags, flagUpdating, onToggle }: FeatureFlagsProps) {
  const t = useTranslations('admin');

  const flagDefs = [
    { key: 'scanner.ai_remediation', label: t('flagAi'), description: t('flagAiDesc') },
    { key: 'scheduler.automation', label: t('flagScheduled'), description: t('flagScheduledDesc') },
    { key: 'auth.github', label: t('flagGithub'), description: t('flagGithubDesc') },
    { key: 'notifications.email', label: t('flagEmail'), description: t('flagEmailDesc') },
  ];

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <ScrollText className="h-5 w-5 text-coral" />{t('featureFlags')}
        </CardTitle>
        <CardDescription>{t('featureFlagsDesc')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {flagDefs.map((flag) => (
          <div key={flag.key} className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">{flag.label}</p>
              <p className="text-xs text-muted-foreground">{flag.description}</p>
            </div>
            <Switch checked={flags[flag.key]} onCheckedChange={(enabled) => onToggle(flag.key, enabled)} disabled={flagUpdating === flag.key} />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
