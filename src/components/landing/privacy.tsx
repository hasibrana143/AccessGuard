'use client';

import { useTranslations } from 'next-intl';
import { Shield, Lock, Users, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export function Privacy() {
  const t = useTranslations('landing');
  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8 bg-muted/30">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <Badge variant="outline" className="border-coral/20 text-coral px-3 py-1 mb-4">
            <Sparkles className="h-3 w-3 mr-1" />
            {t('enterpriseReady')}
          </Badge>
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">{t('privacyTitle')}</h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            {t('privacySub')}
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          <Card>
            <CardHeader>
              <div className="p-3 rounded-xl bg-emerald-500/10 w-fit mb-3">
                <Lock aria-hidden="true" className="h-6 w-6 text-emerald-500" />
              </div>
              <CardTitle>{t('encTitle')}</CardTitle>
              <CardDescription>
                {t('encDesc')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                {t('encBody')}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="p-3 rounded-xl bg-coral/10 w-fit mb-3">
                <Shield aria-hidden="true" className="h-6 w-6 text-coral" />
              </div>
              <CardTitle>{t('socTitle')}</CardTitle>
              <CardDescription>
                {t('socDesc')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                {t('socBody')}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="p-3 rounded-xl bg-blue-500/10 w-fit mb-3">
                <Users aria-hidden="true" className="h-6 w-6 text-blue-500" />
              </div>
              <CardTitle>{t('gdprTitle')}</CardTitle>
              <CardDescription>
                {t('gdprDesc')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                {t('gdprBody')}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}
