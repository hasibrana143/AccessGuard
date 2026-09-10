'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Copy, Terminal, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';

export function ApiKeySettings() {
  const t = useTranslations('settings');
  const tc = useTranslations('common');
  const { toast } = useToast();
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [maskedKey, setMaskedKey] = useState<string | null>(null);
  const [apiKeyLoading, setApiKeyLoading] = useState(false);

  useEffect(() => {
    const fetchKey = async () => {
      try {
        const res = await fetch('/api/settings/api-key');
        const data = await res.json();
        if (data.success && data.data) {
          setMaskedKey(data.data.maskedKey || null);
        }
      } catch { /* ignore */ }
    };
    fetchKey();
  }, []);

  const handleRegenerateKey = async () => {
    setApiKeyLoading(true);
    try {
      const res = await fetch('/api/settings/api-key', { method: 'POST' });
      const data = await res.json();
      if (data.success && data.data) {
        setApiKey(data.data.key);
        setMaskedKey(data.data.maskedKey || data.data.key?.slice(0, 8) + '...');
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
    <div className="space-y-6">
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
    </div>
  );
}
