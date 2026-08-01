'use client';

import { Check, Sparkles, Shield, Users, GitPullRequest, ScrollText } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

const plans = [
  {
    name: 'Starter',
    description: 'For small websites and freelancers',
    price: '$49',
    period: '/month',
    popular: false,
    features: ['1 website', '500 pages/month', 'Weekly scans', 'Email reports', 'Community support'],
    cta: 'Start Free Trial',
    color: 'default',
  },
  {
    name: 'Growth',
    description: 'For growing teams and agencies',
    price: '$149',
    period: '/month',
    popular: true,
    features: ['5 websites', '5,000 pages/month', 'Daily scans', 'AI remediation', 'GitHub auto-PR', 'Priority support'],
    cta: 'Start Free Trial',
    color: 'coral',
  },
  {
    name: 'Agency',
    description: 'For digital agencies managing multiple clients',
    price: '$399',
    period: '/month',
    popular: false,
    features: ['15 websites', '25,000 pages/month', 'White-label reports', 'Team seats', 'GitHub auto-PR', 'Dedicated support'],
    cta: 'Start Free Trial',
    color: 'default',
  },
  {
    name: 'Enterprise',
    description: 'For large organizations',
    price: 'Custom',
    period: '',
    popular: false,
    features: ['Unlimited websites', 'Custom page limits', 'SSO/SAML', 'Dedicated CSM', 'Custom integrations', 'SLA'],
    cta: 'Contact Sales',
    color: 'default',
  },
];

const allPlanFeatures = [
  { icon: Shield, text: 'WCAG 2.1 AA Compliance' },
  { icon: GitPullRequest, text: 'GitHub PR Integration' },
  { icon: ScrollText, text: 'AI-Powered Remediation' },
  { icon: Users, text: 'Team Collaboration' },
];

export function Pricing({ onGetStarted = () => {} }: { onGetStarted?: () => void }) {
  return (
    <section id="pricing" className="py-20 px-4 sm:px-6 lg:px-8 bg-muted/30">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <Badge variant="outline" className="border-coral/20 text-coral px-3 py-1 mb-4">
            <Sparkles className="h-3 w-3 mr-1" />
            Pricing
          </Badge>
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">Simple, Transparent Pricing</h2>
          <p className="text-xl text-muted-foreground">Start free, scale as you grow. No hidden fees.</p>
        </div>

        <div className="grid md:grid-cols-4 gap-8 max-w-6xl mx-auto mb-16">
          {plans.map((plan) => (
            <Card key={plan.name} className={`relative ${plan.popular ? 'border-coral border-2 shadow-lg shadow-coral/10' : ''}`}>
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge className="bg-coral text-coral-foreground px-4 py-1">Most Popular</Badge>
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
          <h3 className="text-lg font-semibold mb-6">All plans include</h3>
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
