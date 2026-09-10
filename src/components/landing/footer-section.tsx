'use client';

import { useTranslations } from 'next-intl';
import { Shield, Github } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';

export function FooterSection() {
  const t = useTranslations('landing');
  const productLinks = [
    { label: t('prod1'), href: '/#features' },
    { label: t('prod2'), href: '/pricing' },
    { label: t('prod3'), href: '/api/docs' },
    { label: t('prod4'), href: '/api/docs?format=json' },
  ];
  const companyLinks = [
    { label: t('comp1'), href: '/#how-it-works' },
    { label: t('comp4'), href: 'mailto:hello@accessguard.dev' },
  ];
  const legalLinks = [
    { label: t('leg1'), href: '/privacy' },
    { label: t('leg2'), href: '/terms' },
  ];
  return (
    <footer className="border-t border-border py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="grid md:grid-cols-4 gap-8 mb-12">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Shield className="h-8 w-8 text-coral" />
              <span className="text-xl font-bold">AccessGuard</span>
            </div>
            <p className="text-sm text-muted-foreground">
              {t('tagline')}
            </p>
            <div className="flex gap-3">
              <a href="https://github.com/hasibrana143/AccessGuard" target="_blank" rel="noopener noreferrer" aria-label={t('githubAria')}><Github aria-hidden="true" className="h-5 w-5 text-muted-foreground hover:text-foreground transition-colors" /></a>
            </div>
          </div>

          <nav aria-label={t('product')}>
            <h3 className="text-sm font-semibold mb-4">{t('product')}</h3>
            <ul className="space-y-2">
              {productLinks.map((link) => (
                <li key={link.label}><Link href={link.href} className="text-sm text-muted-foreground hover:text-foreground transition-colors">{link.label}</Link></li>
              ))}
            </ul>
          </nav>

          <nav aria-label={t('company')}>
            <h3 className="text-sm font-semibold mb-4">{t('company')}</h3>
            <ul className="space-y-2">
              {companyLinks.map((link) => (
                <li key={link.label}><a href={link.href} className="text-sm text-muted-foreground hover:text-foreground transition-colors">{link.label}</a></li>
              ))}
            </ul>
          </nav>

          <nav aria-label={t('legal')}>
            <h3 className="text-sm font-semibold mb-4">{t('legal')}</h3>
            <ul className="space-y-2">
              {legalLinks.map((link) => (
                <li key={link.label}><Link href={link.href} className="text-sm text-muted-foreground hover:text-foreground transition-colors">{link.label}</Link></li>
              ))}
            </ul>
          </nav>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-8 border-t border-border">
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <Badge variant="outline" className="border-emerald-500/20 text-emerald-500 text-xs">{t('gdprBadge')}</Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            {t('rights', { year: new Date().getFullYear() })}
          </p>
        </div>
      </div>
    </footer>
  );
}
