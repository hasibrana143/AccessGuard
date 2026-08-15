'use client';

import { useTranslations } from 'next-intl';
import { Check } from 'lucide-react';
import Link from 'next/link';

export default function PricingPage() {
  const t = useTranslations('landing');
  const plans = [
    {
      name: t('pStarter'),
      price: '$49',
      period: '/month',
      desc: t('pStarterDesc'),
      features: [t('pStarterF1'), t('pStarterF2'), t('pStarterF3'), t('pStarterF4'), t('pStarterF5')],
      cta: t('startFreeTrial'),
      popular: false,
      enterprise: false,
    },
    {
      name: t('pGrowth'),
      price: '$149',
      period: '/month',
      desc: t('pGrowthDesc'),
      features: [t('pGrowthF1'), t('pGrowthF2'), t('pGrowthF3'), t('pGrowthF4'), t('pGrowthF5'), t('pGrowthF6')],
      cta: t('startFreeTrial'),
      popular: true,
      enterprise: false,
    },
    {
      name: t('pAgency'),
      price: '$399',
      period: '/month',
      desc: t('pAgencyDesc'),
      features: [t('pAgencyF1'), t('pAgencyF2'), t('pAgencyF3'), t('pAgencyF4'), t('pAgencyF5'), t('pAgencyF6')],
      cta: t('startFreeTrial'),
      popular: false,
      enterprise: false,
    },
    {
      name: t('pEnterprise'),
      price: 'Custom',
      period: '',
      desc: t('pEnterpriseDesc'),
      features: [t('pEnterpriseF1'), t('pEnterpriseF2'), t('pEnterpriseF3'), t('pEnterpriseF4'), t('pEnterpriseF5'), t('pEnterpriseF6')],
      cta: t('contactSales'),
      popular: false,
      enterprise: true,
    },
  ];

  return (
    <div className="min-h-screen bg-background py-24 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold mb-4">{t('pricingTitle')}</h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            {t('pricingSub')}
          </p>
        </div>

        <div className="grid md:grid-cols-4 gap-8">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`relative rounded-2xl border-2 p-8 ${
                plan.popular
                  ? 'border-coral bg-coral/5 shadow-xl shadow-coral/10'
                  : 'border-border bg-card'
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-coral text-coral-foreground px-4 py-1 rounded-full text-sm font-semibold">
                  {t('mostPopular')}
                </div>
              )}
              <div className="mb-6">
                <h2 className="text-xl font-bold mb-1">{plan.name}</h2>
                <p className="text-muted-foreground text-sm">{plan.desc}</p>
              </div>
              <div className="mb-6">
                <span className="text-4xl font-bold">{plan.price}</span>
                <span className="text-muted-foreground">{plan.period}</span>
              </div>
              <Link
                href={plan.enterprise ? 'mailto:sales@accessguard.dev' : '/auth/register'}
                className={`block text-center py-3 rounded-lg font-semibold mb-8 ${
                  plan.popular
                    ? 'bg-coral text-coral-foreground hover:bg-coral/90'
                    : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                }`}
              >
                {plan.cta}
              </Link>
              <ul className="space-y-3">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-center gap-3 text-sm">
                    <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
