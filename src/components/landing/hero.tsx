'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Shield, Sparkles, Check, ArrowRight, Play, Target, AlertCircle,
  AlertTriangle, Activity, TrendingUp, Github, CheckCircle2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const statColors: Record<string, string> = {
  emerald: 'text-emerald-500',
  red: 'text-red-500',
  orange: 'text-orange-500',
  coral: 'text-coral',
};

const stats = [
  { label: 'Risk Score', value: '78', icon: Target, trend: '+5', color: 'emerald' },
  { label: 'Critical', value: '12', icon: AlertCircle, trend: '-3', color: 'red' },
  { label: 'Serious', value: '45', icon: AlertTriangle, trend: '-8', color: 'orange' },
  { label: 'Scans', value: '156', icon: Activity, trend: '+12', color: 'coral' },
];

const violations = [
  { severity: 'critical', title: 'Missing form labels', page: '/checkout' },
  { severity: 'serious', title: 'Low color contrast', page: '/products' },
  { severity: 'moderate', title: 'Missing alt text', page: '/about' },
];

export function Hero({
  onGetStarted = () => {},
  onWatchDemo = () => {},
}: {
  onGetStarted?: () => void;
  onWatchDemo?: () => void;
}) {
  const [showDemoModal, setShowDemoModal] = useState(false);

  return (
    <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8 overflow-hidden">
      <div className="max-w-7xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="flex items-center gap-2 mb-6">
              <Badge variant="outline" className="border-coral/20 text-coral px-3 py-1">
                <Sparkles aria-hidden="true" className="h-3 w-3 mr-1" />
                Developer-First Solution
              </Badge>
              <Badge variant="outline" className="border-emerald-500/20 text-emerald-500 px-3 py-1">
                <Shield aria-hidden="true" className="h-3 w-3 mr-1" />
                WCAG 2.1 AA Compliant
              </Badge>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight mb-6 leading-tight">
              Prevent <span className="text-coral">$50k+ ADA Lawsuits</span>
              <br />
              <span className="text-muted-foreground">Before They Cost You</span>
            </h1>

            <p className="text-xl text-muted-foreground mb-8 leading-relaxed">
              Unlike overlay widgets that lawsuits allege don&apos;t work, AccessGuard scans your{' '}
              <strong className="text-foreground">actual code</strong>,
              generates <strong className="text-foreground">AI-powered fixes</strong>, and integrates into your{' '}
              <strong className="text-foreground">CI/CD pipeline</strong>.
            </p>

            <div className="flex flex-col sm:flex-row items-start gap-4 mb-8">
              <Button size="lg" onClick={onGetStarted} className="bg-coral hover:bg-coral/90 text-coral-foreground h-14 px-8 text-lg">
                Start Free Trial
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <Button size="lg" variant="outline" className="h-14 px-8 text-lg" onClick={() => { setShowDemoModal(true); onWatchDemo(); }}>
                <Play className="mr-2 h-5 w-5" />
                Watch Demo
              </Button>
            </div>

            <div className="flex items-center gap-6 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Check aria-hidden="true" className="h-4 w-4 text-emerald-500" />
                No credit card required
              </div>
              <div className="flex items-center gap-2">
                <Check aria-hidden="true" className="h-4 w-4 text-emerald-500" />
                14-day free trial
              </div>
              <div className="flex items-center gap-2">
                <Check aria-hidden="true" className="h-4 w-4 text-emerald-500" />
                Cancel anytime
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="relative"
          >
            {/* Dashboard Preview */}
            <div className="bg-card border border-border rounded-2xl shadow-2xl overflow-hidden">
              <div className="bg-muted/50 px-4 py-3 flex items-center justify-between border-b border-border">
                <div className="flex gap-1.5" aria-hidden="true">
                  <div className="w-3 h-3 rounded-full bg-red-500/60" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
                  <div className="w-3 h-3 rounded-full bg-emerald-500/60" />
                </div>
                <div className="text-xs text-muted-foreground">app.accessguard.io/dashboard</div>
                <div className="flex gap-2" aria-hidden="true">
                  <div className="w-4 h-4 rounded bg-muted" />
                  <div className="w-4 h-4 rounded bg-muted" />
                </div>
              </div>

              <div className="p-6 space-y-4">
                {/* Stats Row */}
                <div className="grid grid-cols-4 gap-3">
                  {stats.map((stat) => (
                    <div key={stat.label} className="bg-muted/30 rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <stat.icon aria-hidden="true" className={`h-4 w-4 ${statColors[stat.color]}`} />
                        <span className="text-xs text-muted-foreground">{stat.label}</span>
                      </div>
                      <div className="text-2xl font-bold">{stat.value}</div>
                      <div className={`text-xs ${stat.trend.startsWith('+') ? 'text-emerald-500' : 'text-red-500'} mt-1`}>
                        {stat.trend} this week
                      </div>
                    </div>
                  ))}
                </div>

                {/* Chart Placeholder */}
                <div className="bg-muted/30 rounded-xl p-4 h-40 flex items-center justify-center">
                  <div className="text-center text-muted-foreground">
                    <TrendingUp aria-hidden="true" className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <span className="text-sm">Violation Trends</span>
                  </div>
                </div>

                {/* Violations List */}
                <div className="space-y-2" aria-hidden="true">
                  {violations.map((v) => (
                    <div key={v.title} className="flex items-center gap-3 p-3 bg-muted/20 rounded-lg">
                      <div className={`w-2 h-2 rounded-full ${v.severity === 'critical' ? 'bg-red-500' : v.severity === 'serious' ? 'bg-orange-500' : 'bg-yellow-500'}`} />
                      <span className="text-sm flex-1">{v.title}</span>
                      <span className="text-xs text-muted-foreground">{v.page}</span>
                      <Button variant="ghost" size="sm" className="h-7" tabIndex={-1} aria-hidden="true">Fix</Button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Floating Elements */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.5 }}
              className="absolute -right-4 top-20 bg-emerald-700 text-white px-4 py-2 rounded-lg shadow-lg text-sm font-medium"
            >
              <Check aria-hidden="true" className="inline h-4 w-4 mr-1" />
              WCAG 2.1 AA Compliant
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.7 }}
              className="absolute -left-4 bottom-40 bg-card border border-border px-4 py-3 rounded-lg shadow-lg"
            >
              <div className="flex items-center gap-2">
                <Github aria-hidden="true" className="h-5 w-5" />
                <span className="text-sm font-medium">PR Created</span>
                <CheckCircle2 aria-hidden="true" className="h-4 w-4 text-emerald-500" />
              </div>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
