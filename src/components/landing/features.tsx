'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Shield, Zap, Sparkles, Check, Globe, Cpu, Gauge, Workflow } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const features = [
  {
    title: 'Real WCAG Scanning',
    icon: Globe,
    description: 'Our engine scans your actual rendered DOM, not just HTML snapshots. We detect violations other tools miss.',
    details: ['axe-core integration', 'Custom rule detection', 'SPA & dynamic content support', 'Screenshot evidence capture'],
    color: 'coral',
  },
  {
    title: 'AI-Powered Remediation',
    icon: Sparkles,
    description: 'Get AI-generated fix code for each violation. Our models are trained on WCAG patterns and real-world fixes.',
    details: ['Automated fix generation', 'Code explanations', 'Confidence scoring', 'Batch fix application'],
    color: 'emerald',
  },
  {
    title: 'CI/CD Integration',
    icon: Cpu,
    description: 'Prevent accessibility regressions before they reach production. Integrate scanning into your pipeline.',
    details: ['GitHub Actions integration', 'PR status checks', 'Automated blocking', 'Deploy gate enforcement'],
    color: 'coral',
  },
  {
    title: 'Legal Shield™ Reports',
    icon: Shield,
    description: 'Generate court-admissible PDF reports with cryptographic timestamps showing your good-faith remediation efforts.',
    details: ['Court-admissible format', 'Cryptographic timestamps', 'Remediation audit trail', 'Executive summaries'],
    color: 'emerald',
  },
  {
    title: 'Performance Monitoring',
    icon: Gauge,
    description: 'Track your accessibility score over time. Get alerted when new violations appear on your pages.',
    details: ['Historical trend tracking', 'Real-time alerts', 'Custom score targets', 'Team notifications'],
    color: 'coral',
  },
  {
    title: 'Team Collaboration',
    icon: Workflow,
    description: 'Assign violations, track fixes, and generate PRs directly from our platform. Built for dev teams.',
    details: ['Violation assignments', 'GitHub PR creation', 'Comment & review', 'Audit logging'],
    color: 'emerald',
  },
];

export function Features() {
  const [activeFeature, setActiveFeature] = useState<number | null>(null);

  return (
    <section id="features" className="py-20 px-4 sm:px-6 lg:px-8 bg-muted/30">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <Badge variant="outline" className="border-coral/20 text-coral px-3 py-1 mb-4">
            <Zap className="h-3 w-3 mr-1" />
            Features
          </Badge>
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            Why AccessGuard Beats Overlay Widgets
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Overlay widgets are being challenged in court. Real code fixes are the only defensible approach.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, i) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              onMouseEnter={() => setActiveFeature(i)}
              onMouseLeave={() => setActiveFeature(null)}
              className={`p-6 rounded-2xl border transition-all duration-300 cursor-default ${
                activeFeature === i
                  ? 'border-coral/30 bg-coral/5 shadow-lg shadow-coral/5'
                  : 'border-border bg-card hover:border-coral/20'
              }`}
            >
              <div className={`p-3 rounded-xl w-fit mb-3 ${activeFeature === i ? 'bg-coral/10' : 'bg-muted/50'}`}>
                <feature.icon aria-hidden="true" className={`h-6 w-6 ${activeFeature === i ? 'text-coral' : 'text-muted-foreground'}`} />
              </div>
              <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
              <p className="text-sm text-muted-foreground mb-4">{feature.description}</p>
              <ul className="space-y-1.5">
                {feature.details.map((detail) => (
                  <li key={detail} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Check aria-hidden="true" className="h-3.5 w-3.5 text-emerald-500 flex-shrink-0" />
                    {detail}
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
