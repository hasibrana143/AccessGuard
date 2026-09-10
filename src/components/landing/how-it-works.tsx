'use client';

import { useTranslations } from 'next-intl';
import { ScanLine, Code2, FileCheck2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';

/**
 * How it works — replaces the fabricated testimonial wall with the real
 * product workflow: scan → fix → prove. Every step maps to a real route.
 */
export function HowItWorks() {
  const t = useTranslations('landing');
  const steps = [
    { icon: ScanLine, title: t('how1Title'), body: t('how1Body') },
    { icon: Code2, title: t('how2Title'), body: t('how2Body') },
    { icon: FileCheck2, title: t('how3Title'), body: t('how3Body') },
  ];
  return (
    <section id="how-it-works" className="py-20 px-4 sm:px-6 lg:px-8 bg-muted/40" aria-labelledby="how-it-works-heading">
      <div className="max-w-6xl mx-auto">
        <div className="mb-12 max-w-2xl">
          <Badge variant="outline" className="border-coral/20 text-coral px-3 py-1 mb-4">{t('howBadge')}</Badge>
          <h2 id="how-it-works-heading" className="text-3xl sm:text-4xl font-bold mb-4">
            {t('howTitle')}
          </h2>
          <p className="text-xl text-muted-foreground">{t('howSub')}</p>
        </div>

        <ol className="grid grid-cols-1 sm:grid-cols-3 gap-6 list-none p-0 m-0">
          {steps.map((step, i) => (
            <li key={step.title}>
              <Card className="h-full">
                <CardContent className="p-6 flex flex-col h-full">
                  <div className="flex items-center gap-3 mb-4">
                    <span className="text-sm font-mono text-muted-foreground" aria-hidden="true">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <div className="p-2.5 rounded-xl bg-coral/10">
                      <step.icon aria-hidden="true" className="h-5 w-5 text-coral" />
                    </div>
                  </div>
                  <p className="font-semibold mb-2">{step.title}</p>
                  <p className="text-sm text-muted-foreground leading-relaxed">{step.body}</p>
                </CardContent>
              </Card>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
