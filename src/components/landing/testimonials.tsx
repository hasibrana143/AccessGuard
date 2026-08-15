'use client';

import { useTranslations } from 'next-intl';
import { Star } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';

export function Testimonials() {
  const t = useTranslations('landing');
  const testimonials = [
    { quote: t('tm1Quote'), name: t('tm1Name'), role: t('tm1Role') },
    { quote: t('tm2Quote'), name: t('tm2Name'), role: t('tm2Role') },
    { quote: t('tm3Quote'), name: t('tm3Name'), role: t('tm3Role') },
    { quote: t('tm4Quote'), name: t('tm4Name'), role: t('tm4Role') },
  ];
  return (
    <section id="testimonials" className="py-20 px-4 sm:px-6 lg:px-8 bg-muted/40" aria-labelledby="testimonials-heading">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <Badge variant="outline" className="border-coral/20 text-coral px-3 py-1 mb-4">{t('testimonialsBadge')}</Badge>
          <h2 id="testimonials-heading" className="text-3xl sm:text-4xl font-bold mb-4">
            {t('testimonialsTitle')}
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {testimonials.map((item) => (
            <Card key={item.name} className="h-full">
              <CardContent className="p-6 flex flex-col h-full">
                <div role="img" aria-label={t('rated5')} className="flex gap-1 mb-4">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-warning text-warning" aria-hidden="true" />
                  ))}
                </div>
                <blockquote className="flex-1 text-muted-foreground leading-relaxed mb-6">
                  &ldquo;{item.quote}&rdquo;
                </blockquote>
                <footer className="border-t border-border pt-4">
                  <p className="font-semibold">{item.name}</p>
                  <p className="text-sm text-muted-foreground">{item.role}</p>
                </footer>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
