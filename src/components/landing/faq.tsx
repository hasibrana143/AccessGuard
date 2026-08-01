'use client';

import { Badge } from '@/components/ui/badge';
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from '@/components/ui/accordion';

const faqs = [
  {
    q: 'How does AccessGuard differ from overlay widgets?',
    a: 'Overlay widgets add a layer of JavaScript on top of your site to "fix" accessibility issues. Lawsuits allege they don\'t actually fix the underlying code. AccessGuard scans your actual source code, finds real violations, and generates concrete fixes you can deploy through your normal development workflow.',
  },
  {
    q: 'Do I need technical skills to use AccessGuard?',
    a: 'While AccessGuard is built for developers, our dashboard makes it easy for anyone to monitor compliance. Non-technical team members can track progress, generate reports, and manage violations through our intuitive interface.',
  },
  {
    q: 'How often should I scan my website?',
    a: 'We recommend scanning after every deployment and at least weekly for continuous monitoring. Our automated scheduling makes this effortless — set it once and we\'ll notify you of any new violations.',
  },
  {
    q: 'Can AccessGuard prevent ADA lawsuits?',
    a: 'While no tool can guarantee lawsuit prevention, courts have consistently recognized good-faith remediation efforts. AccessGuard provides timestamped audit trails, generated fix PRs, and compliance reports that demonstrate your commitment to accessibility.',
  },
  {
    q: 'What WCAG standards do you support?',
    a: 'We currently support WCAG 2.1 Level A and AA standards, covering all success criteria. Our engine tests against actual user scenarios and browser rendering, not just static HTML analysis.',
  },
  {
    q: 'Is my source code secure?',
    a: 'Yes. All scans are performed in isolated environments. Your source code never leaves our secure infrastructure. We\'re SOC 2 compliant and encrypt all data in transit and at rest.',
  },
];

export function FAQ() {
  return (
    <section id="faq" className="py-20 px-4 sm:px-6 lg:px-8" aria-labelledby="faq-heading">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <Badge variant="outline" className="border-coral/20 text-coral px-3 py-1 mb-4">FAQ</Badge>
          <h2 id="faq-heading" className="text-3xl sm:text-4xl font-bold mb-4">Frequently Asked Questions</h2>
        </div>

        <Accordion type="single" collapsible className="w-full">
          {faqs.map((faq, index) => (
            <AccordionItem key={faq.q} value={`item-${index}`}>
              <AccordionTrigger className="text-base font-semibold">
                {faq.q}
              </AccordionTrigger>
              <AccordionContent>
                <p className="text-muted-foreground leading-relaxed">{faq.a}</p>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}
