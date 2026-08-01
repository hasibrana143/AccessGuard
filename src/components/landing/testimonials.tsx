'use client';

import { Star } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';

const testimonials = [
  {
    quote: 'AccessGuard caught 47 violations on our checkout flow before we shipped. The generated fix PRs saved our team weeks of manual work.',
    name: 'Sarah Chen',
    role: 'Engineering Lead, Northwind Commerce',
  },
  {
    quote: 'We passed our internal accessibility audit two weeks after switching to AccessGuard. The scheduled scans keep us compliant without any manual effort.',
    name: 'Marcus Johnson',
    role: 'VP Product, Arcadia Health',
  },
  {
    quote: 'The compliance reports gave our legal team exactly what they needed to demonstrate good-faith remediation. Worth every penny.',
    name: 'Priya Patel',
    role: 'Operations Director, Lumina Realty',
  },
  {
    quote: 'Setup took five minutes. Our risk score went from 41 to 92 in the first month of using the auto-fix workflow.',
    name: 'David Kim',
    role: 'CTO, Beacon Software',
  },
];

export function Testimonials() {
  return (
    <section id="testimonials" className="py-20 px-4 sm:px-6 lg:px-8 bg-muted/40" aria-labelledby="testimonials-heading">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <Badge variant="outline" className="border-coral/20 text-coral px-3 py-1 mb-4">Testimonials</Badge>
          <h2 id="testimonials-heading" className="text-3xl sm:text-4xl font-bold mb-4">
            Trusted by teams who ship accessible products
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {testimonials.map((t) => (
            <Card key={t.name} className="h-full">
              <CardContent className="p-6 flex flex-col h-full">
                <div role="img" aria-label="Rated 5 out of 5 stars" className="flex gap-1 mb-4">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-warning text-warning" aria-hidden="true" />
                  ))}
                </div>
                <blockquote className="flex-1 text-muted-foreground leading-relaxed mb-6">
                  &ldquo;{t.quote}&rdquo;
                </blockquote>
                <footer className="border-t border-border pt-4">
                  <p className="font-semibold">{t.name}</p>
                  <p className="text-sm text-muted-foreground">{t.role}</p>
                </footer>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
