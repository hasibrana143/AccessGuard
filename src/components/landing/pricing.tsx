'use client';

import { useTranslations } from 'next-intl';
import { Check, Sparkles, Shield, Users, GitPullRequest, ScrollText } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

export function Pricing({ onGetStarted = () => {} }: { onGetStarted?: () => void }) {
  const t = useTranslations('landing');

  const plans = [
    {
      name: t('pStarter'),
      description: t('pStarterDesc'),
      price: '$49',
      period: '/month',
      popular: false,
      features: [t('pStarterF1'), t('pStarterF2'), t('pStarterF3'), t('pStarterF4'), t('pStarterF5')],
      cta: t('startFreeTrial'),
      color: 'default',
    },
    {
      name: t('pGrowth'),
      description: t('pGrowthDesc'),
      price: '$149',
      period: '/month',
      popular: true,
      features: [t('pGrowthF1'), t('pGrowthF2'), t('pGrowthF3'), t('pGrowthF4'), t('pGrowthF5'), t('pGrowthF6')],
      cta: t('startFreeTrial'),
      color: 'coral',
    },
    {
      name: t('pAgency'),
      description: t('pAgencyDesc'),
      price: '$399',
      period: '/month',
      popular: false,
      features: [t('pAgencyF1'), t('pAgencyF2'), t('pAgencyF3'), t('pAgencyF4'), t('pAgencyF5'), t('pAgencyF6')],
      cta: t('startFreeTrial'),
      color: 'default',
    },
    {
      name: t('pEnterprise'),
      description: t('pEnterpriseDesc'),
      price: 'Custom',
      period: '',
      popular: false,
      features: [t('pEnterpriseF1'), t('pEnterpriseF2'), t('pEnterpriseF3'), t('pEnterpriseF4'), t('pEnterpriseF5'), t('pEnterpriseF6')],
      cta: t('contactSales'),
      color: 'default',
    },
  ];

  const allPlanFeatures = [
    { icon: Shield, text: t('allF1') },
    { icon: GitPullRequest, text: t('allF2') },
    { icon: ScrollText, text: t('allF3') },
    { icon: Users, text: t('allF4') },
  ];

  return (
    <section id="pricing" className="py-20 px-4 sm:px-6 lg:px-8 bg-muted/30">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <Badge variant="outline" className="border-coral/20 text-coral px-3 py-1 mb-4">
            <Sparkles className="h-3 w-3 mr-1" />
            {t('pricingBadge')}
          </Badge>
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">{t('pricingTitle')}</h2>
          <p className="text-xl text-muted-foreground">{t('pricingSub')}</p>
        </div>

        <div className="grid md:grid-cols-4 gap-8 max-w-6xl mx-auto mb-16">
          {plans.map((plan) => (
            <Card key={plan.name} className={`relative ${plan.popular ? 'border-coral border-2 shadow-lg shadow-coral/10' : ''}`}>
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge className="bg-coral text-coral-foreground px-4 py-1">{t('mostPopular')}</Badge>
                </div>
              )}
              <CardHeader className="text-center pb-2">
                <CardTitle className="text-xl">{plan.name}</CardTitle>
                <CardDescription>{plan.description}</CardDescription>
              </CardHeader>
<CardContent className="text-center pt-4">
                <div className="mb-6">
                  <span className="text-4xl font-bold">{plan.price}</span>
                  {plan.period && <span className="text-muted-foreground">{plan.period}</span>}
                </div>
                <ul className="space-y-3 text-left">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-3 text-sm">
                      <Check aria-hidden="true" className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </CardContent>
              <CardFooter>
                <Button
                  onClick={onGetStarted}
                  className={`w-full ${plan.color === 'coral' ? 'bg-coral hover:bg-coral/90 text-coral-foreground' : ''}`}
                  variant={plan.color === 'coral' ? 'default' : 'outline'}
                >
                  {plan.cta}
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>

        {/* All plans include */}
        <div className="text-center">
          <h3 className="text-lg font-semibold mb-6">{t('allPlansInclude')}</h3>
          <div className="flex flex-wrap justify-center gap-8">
            {allPlanFeatures.map((feature) => (
              <div key={feature.text} className="flex items-center gap-2 text-sm text-muted-foreground">
                <feature.icon aria-hidden="true" className="h-4 w-4 text-emerald-500" />
                {feature.text}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
