'use client';

import { Check } from 'lucide-react';
import Link from 'next/link';

const plans = [
  {
    name: 'Starter',
    price: '$49',
    period: '/month',
    desc: 'For small websites and freelancers',
    features: ['1 website', 'Up to 500 pages/month', 'Weekly scans', 'Email reports', 'Community support'],
    cta: 'Start Free Trial',
    popular: false,
  },
  {
    name: 'Growth',
    price: '$149',
    period: '/month',
    desc: 'For growing teams and agencies',
    features: ['5 websites', 'Up to 5,000 pages/month', 'Daily scans', 'AI remediation suggestions', 'GitHub auto-PR', 'Priority support'],
    cta: 'Start Free Trial',
    popular: true,
  },
  {
    name: 'Agency',
    price: '$399',
    period: '/month',
    desc: 'For digital agencies managing clients',
    features: ['15 websites', 'Up to 25,000 pages/month', 'White-label reports', 'Team seats', 'GitHub auto-PR', 'Dedicated support'],
    cta: 'Start Free Trial',
    popular: false,
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    period: '',
    desc: 'For large organizations',
    features: ['Unlimited websites', 'Unlimited pages', 'SSO / SAML', 'Dedicated CSM', 'Custom integrations', 'SLA'],
    cta: 'Contact Sales',
    popular: false,
  },
];

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-background py-24 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold mb-4">Simple, Transparent Pricing</h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Start with a 14-day free trial. No credit card required.
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
                  Most Popular
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
                href={plan.name === 'Enterprise' ? 'mailto:sales@accessguard.dev' : '/auth/register'}
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
