'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import { Shield, Zap, Sparkles, Check, Globe, Cpu, Gauge, Workflow } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export function Features() {
  const t = useTranslations('landing');
  const [activeFeature, setActiveFeature] = useState<number | null>(null);

  const features = [
    {
      title: t('f1Title'),
      icon: Globe,
      description: t('f1Desc'),
      details: [t('f1d1'), t('f1d2'), t('f1d3'), t('f1d4')],
      color: 'coral',
    },
    {
      title: t('f2Title'),
      icon: Sparkles,
      description: t('f2Desc'),
      details: [t('f2d1'), t('f2d2'), t('f2d3'), t('f2d4')],
      color: 'emerald',
    },
    {
      title: t('f3Title'),
      icon: Cpu,
      description: t('f3Desc'),
      details: [t('f3d1'), t('f3d2'), t('f3d3'), t('f3d4')],
      color: 'coral',
    },
    {
      title: t('f4Title'),
      icon: Shield,
      description: t('f4Desc'),
      details: [t('f4d1'), t('f4d2'), t('f4d3'), t('f4d4')],
      color: 'emerald',
    },
    {
      title: t('f5Title'),
      icon: Gauge,
      description: t('f5Desc'),
      details: [t('f5d1'), t('f5d2'), t('f5d3'), t('f5d4')],
      color: 'coral',
    },
    {
      title: t('f6Title'),
      icon: Workflow,
      description: t('f6Desc'),
      details: [t('f6d1'), t('f6d2'), t('f6d3'), t('f6d4')],
      color: 'emerald',
    },
  ];

  return (
    <section id="features" className="py-20 px-4 sm:px-6 lg:px-8 bg-muted/30">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <Badge variant="outline" className="border-coral/20 text-coral px-3 py-1 mb-4">
            <Zap className="h-3 w-3 mr-1" />
            {t('featuresBadge')}
          </Badge>
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            {t('whyAccessGuard')}
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            {t('featuresSub')}
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
