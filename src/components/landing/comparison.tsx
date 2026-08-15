'use client';

import { useTranslations } from 'next-intl';
import { XCircle, CheckCircle2, Zap } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function Comparison() {
  const t = useTranslations('landing');
  const overlayIssues = [t('ov1'), t('ov2'), t('ov3'), t('ov4'), t('ov5'), t('ov6')];
  const accessGuardBenefits = [t('ag1'), t('ag2'), t('ag3'), t('ag4'), t('ag5'), t('ag6')];
  return (
    <section id="comparison" className="py-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <Badge variant="outline" className="border-coral/20 text-coral px-3 py-1 mb-4">
            <Zap className="h-3 w-3 mr-1" />
            {t('comparisonBadge')}
          </Badge>
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            {t('overlayVs')}
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            {t('comparisonSub')}
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
          {/* Overlay Widgets Card */}
          <Card className="border-red-500/20">
            <CardHeader className="text-center border-b border-border pb-6">
              <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4">
                <XCircle aria-hidden="true" className="h-8 w-8 text-red-500" />
              </div>
              <CardTitle className="text-2xl text-red-500">{t('overlayWidgets')}</CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <ul className="space-y-3">
                {overlayIssues.map((issue) => (
                  <li key={issue} className="flex items-start gap-3">
                    <XCircle aria-hidden="true" className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                    <span className="text-sm">{issue}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {/* AccessGuard Card */}
          <Card className="border-emerald-500/20">
            <CardHeader className="text-center border-b border-border pb-6">
              <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 aria-hidden="true" className="h-8 w-8 text-emerald-500" />
              </div>
              <CardTitle className="text-2xl text-emerald-500">{t('brandName')}</CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <ul className="space-y-3">
                {accessGuardBenefits.map((benefit) => (
                  <li key={benefit} className="flex items-start gap-3">
                    <CheckCircle2 aria-hidden="true" className="h-5 w-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                    <span className="text-sm">{benefit}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}
