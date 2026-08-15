'use client';

import { useTranslations } from 'next-intl';
import { Shield, Github, ExternalLink, MessageSquare } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export function FooterSection() {
  const t = useTranslations('landing');
  const productLinks = [t('prod1'), t('prod2'), t('prod3'), t('prod4'), t('prod5')];
  const companyLinks = [t('comp1'), t('comp2'), t('comp3'), t('comp4'), t('comp5')];
  const legalLinks = [t('leg1'), t('leg2'), t('leg3'), t('leg4'), t('leg5')];
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
              <a href="#" aria-label={t('githubAria')}><Github aria-hidden="true" className="h-5 w-5 text-muted-foreground hover:text-foreground transition-colors" /></a>
              <a href="#" aria-label={t('twitterAria')}><ExternalLink aria-hidden="true" className="h-5 w-5 text-muted-foreground hover:text-foreground transition-colors" /></a>
              <a href="#" aria-label={t('linkedinAria')}><MessageSquare aria-hidden="true" className="h-5 w-5 text-muted-foreground hover:text-foreground transition-colors" /></a>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold mb-4">{t('product')}</h3>
            <ul className="space-y-2">
              {productLinks.map((link) => (
                <li key={link}><a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">{link}</a></li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold mb-4">{t('company')}</h3>
            <ul className="space-y-2">
              {companyLinks.map((link) => (
                <li key={link}><a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">{link}</a></li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold mb-4">{t('legal')}</h3>
            <ul className="space-y-2">
              {legalLinks.map((link) => (
                <li key={link}><a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">{link}</a></li>
              ))}
            </ul>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-8 border-t border-border">
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <Badge variant="outline" className="border-emerald-500/20 text-emerald-500 text-xs">{t('soc2Badge')}</Badge>
            <Badge variant="outline" className="border-blue-500/20 text-blue-500 text-xs">{t('gdprBadge')}</Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            {t('rights', { year: new Date().getFullYear() })}
          </p>
        </div>
      </div>
    </footer>
  );
}
