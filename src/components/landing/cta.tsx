'use client';

import { useTranslations } from 'next-intl';
import { Shield, ArrowRight, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function CTA({ onGetStarted = () => {} }: { onGetStarted?: () => void }) {
  const t = useTranslations('landing');
  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto text-center">
        <div className="p-4 rounded-xl bg-coral/10 w-fit mx-auto mb-6">
          <Shield aria-hidden="true" className="h-8 w-8 text-coral" />
        </div>
        <h2 className="text-3xl sm:text-4xl font-bold mb-4">
          {t('ctaTitle')}
        </h2>
        <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
          {t('ctaSub')}
        </p>
        <Button size="lg" onClick={onGetStarted} className="bg-coral hover:bg-coral/90 text-coral-foreground h-14 px-8 text-lg mb-4">
          {t('startYourFreeTrial')}
          <ArrowRight className="ml-2 h-5 w-5" />
        </Button>
        <div className="flex items-center justify-center gap-6 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Check aria-hidden="true" className="h-4 w-4 text-emerald-500" />
            {t('noCreditCard')}
          </div>
          <div className="flex items-center gap-2">
            <Check aria-hidden="true" className="h-4 w-4 text-emerald-500" />
            {t('trial14')}
          </div>
          <div className="flex items-center gap-2">
            <Check aria-hidden="true" className="h-4 w-4 text-emerald-500" />
            {t('cancelAnytime')}
          </div>
        </div>
      </div>
    </section>
  );
}
