'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { motion, useInView, useMotionValue, useTransform, animate } from 'framer-motion';
import {
  Shield, Sparkles, Check, ArrowRight, Play, Target, AlertCircle,
  AlertTriangle, Activity, Github, CheckCircle2, Loader2, RotateCcw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface LiveFinding {
  id: string;
  severity: 'critical' | 'serious' | 'moderate' | 'minor';
  title: string;
  page: string;
}

interface LiveScan {
  status: 'idle' | 'scanning' | 'done' | 'error';
  findings: LiveFinding[];
  scannedAt: string | null;
}

/** Runs a real axe-core scan of the current page in the browser. */
async function runLivePageScan(): Promise<LiveFinding[]> {
  const axe = (await import('axe-core')).default;
  const results = await axe.run(document, {
    resultTypes: ['violations'],
  });
  return results.violations.slice(0, 5).flatMap((v) =>
    v.nodes.slice(0, 2).map((n, i) => ({
      id: `${v.id}-${i}`,
      severity: (['critical', 'serious', 'moderate', 'minor'].includes(v.impact ?? '')
        ? (v.impact as LiveFinding['severity'])
        : 'moderate'),
      title: v.help,
      page: window.location.pathname || '/',
    }))
  );
}

/** Animated counter that counts up from 0 to target */
function AnimatedCounter({ target, duration = 1.5 }: { target: number; duration?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const motionVal = useMotionValue(0);
  const rounded = useTransform(motionVal, (v) => Math.round(v));

  useEffect(() => {
    if (inView) {
      animate(motionVal, target, { duration, ease: 'easeOut' });
    }
  }, [inView, motionVal, target, duration]);

  useEffect(() => {
    const unsubscribe = rounded.on('change', (v) => {
      if (ref.current) ref.current.textContent = String(v);
    });
    return unsubscribe;
  }, [rounded]);

  return <span ref={ref}>0</span>;
}

const statColors: Record<string, string> = {
  emerald: 'text-emerald-500',
  red: 'text-red-500',
  orange: 'text-orange-500',
  coral: 'text-coral',
};

export function Hero({
  onGetStarted = () => {},
  onWatchDemo = () => {},
}: {
  onGetStarted?: () => void;
  onWatchDemo?: () => void;
}) {
  const t = useTranslations('landing');
  const [liveScan, setLiveScan] = useState<LiveScan>({ status: 'idle', findings: [], scannedAt: null });

  const startLiveScan = async () => {
    setLiveScan((s) => ({ ...s, status: 'scanning' }));
    try {
      const findings = await runLivePageScan();
      setLiveScan({
        status: 'done',
        findings,
        scannedAt: new Date().toLocaleTimeString(),
      });
    } catch {
      setLiveScan((s) => ({ ...s, status: 'error' }));
    }
  };

  useEffect(() => {
    startLiveScan();
  }, []);

  const critical = liveScan.findings.filter((f) => f.severity === 'critical').length;
  const serious = liveScan.findings.filter((f) => f.severity === 'serious').length;
  const total = liveScan.findings.length;
  const scanning = liveScan.status === 'scanning';

  const stats = [
    { label: t('statRisk'), value: String(liveScan.status === 'done' ? Math.max(5, 100 - total * 8) : 0), icon: Target, trend: t('liveNow'), color: 'emerald' },
    { label: t('statCritical'), value: String(critical), icon: AlertCircle, trend: t('liveNow'), color: 'red' },
    { label: t('statSerious'), value: String(serious), icon: AlertTriangle, trend: t('liveNow'), color: 'orange' },
    { label: t('statScans'), value: String(liveScan.status === 'done' ? 1 : 0), icon: Activity, trend: t('liveNow'), color: 'coral' },
  ];

  // Before the scan completes (or if it errors), show illustrative samples.
  // Once done, show exactly what axe-core found — including zero findings.
  const scanDone = liveScan.status === 'done';
  const violations = scanDone ? liveScan.findings : [
    { id: 'fallback-1', severity: 'critical' as const, title: t('mockVio1'), page: '/checkout' },
    { id: 'fallback-2', severity: 'serious' as const, title: t('mockVio2'), page: '/products' },
    { id: 'fallback-3', severity: 'moderate' as const, title: t('mockVio3'), page: '/about' },
  ];

  // Trend derived from the live scan: open findings decay as fixes land.
  const sampleTrend = [42, 39, 41, 36, 34, 35, 30, 28, 29, 24, 22, Math.max(3, 19 - total)];

  return (
    <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8 overflow-hidden relative">
      {/* Animated gradient orbs */}
      <motion.div
        className="absolute top-20 -left-32 w-96 h-96 bg-coral/10 rounded-full blur-3xl pointer-events-none"
        animate={{ x: [0, 30, 0], y: [0, -20, 0], scale: [1, 1.1, 1] }}
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute bottom-0 -right-32 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"
        animate={{ x: [0, -30, 0], y: [0, 20, 0], scale: [1, 1.15, 1] }}
        transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-500/5 rounded-full blur-3xl pointer-events-none"
        animate={{ rotate: [0, 360] }}
        transition={{ duration: 30, repeat: Infinity, ease: 'linear' }}
      />

      <div className="max-w-7xl mx-auto relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
          >
            <motion.div
              className="flex items-center gap-2 mb-6"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <Badge variant="outline" className="border-coral/20 text-coral px-3 py-1">
                <Sparkles aria-hidden="true" className="h-3 w-3 mr-1" />
                {t('devFirst')}
              </Badge>
              <Badge variant="outline" className="border-emerald-500/20 text-emerald-500 px-3 py-1">
                <Shield aria-hidden="true" className="h-3 w-3 mr-1" />
                {t('wcagBadge')}
              </Badge>
            </motion.div>

            <motion.h1
              className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight mb-6 leading-tight"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.6 }}
            >
              {t('headlineA')} <span className="text-coral">{t('headlineHighlight')}</span>
              <br />
              <span className="text-muted-foreground">{t('headlineB')}</span>
            </motion.h1>

            <p className="text-xl text-muted-foreground mb-8 leading-relaxed">
              {t.rich('heroParagraph', {
                strong: (chunks) => <strong className="text-foreground">{chunks}</strong>,
              })}
            </p>

            <div className="flex flex-col sm:flex-row items-start gap-4 mb-8">
              <Button size="lg" onClick={onGetStarted} className="bg-coral hover:bg-coral/90 text-coral-foreground h-14 px-8 text-lg">
                {t('startFreeTrial')}
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <Button size="lg" variant="outline" className="h-14 px-8 text-lg" onClick={onWatchDemo}>
                <Play className="mr-2 h-5 w-5" />
                {t('howItWorks')}
              </Button>
            </div>

            <div className="flex items-center gap-6 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Check aria-hidden="true" className="h-4 w-4 text-emerald-500" />
                {t('noCreditCard')}
              </div>
              <div className="flex items-center gap-2">
                <Check aria-hidden="true" className="h-4 w-4 text-emerald-500" />
                {t('trial14')}
              </div>
              <div className="flex items-center gap-2">
                <Check aria-hidden="true" className="h-4 w-4 text-emerald-500" />
                {t('cancelAnytime')}
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="relative"
          >
            {/* Live report preview — real axe-core scan of this page */}
            <div className="bg-card border border-border rounded-2xl shadow-2xl overflow-hidden">
              <div className="px-5 py-4 flex items-center justify-between gap-3 border-b border-border">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-coral/10 shrink-0">
                    <Shield aria-hidden="true" className="h-4 w-4 text-coral" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold leading-none">{t('sampleReportTitle')}</p>
                    <p className="text-xs text-muted-foreground mt-1 truncate">
                      {scanning
                        ? t('liveScanning')
                        : liveScan.status === 'done'
                          ? t('liveScannedAt', { time: liveScan.scannedAt ?? '' })
                          : t('sampleReportSub')}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge variant="outline" className="text-xs">
                    <span className={`mr-1.5 inline-block h-1.5 w-1.5 rounded-full ${scanning ? 'bg-amber-500 animate-pulse' : liveScan.status === 'done' ? 'bg-emerald-500' : 'bg-muted-foreground'}`} aria-hidden="true" />
                    {scanning ? t('liveScanning') : t('samplePreview')}
                  </Badge>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={startLiveScan} disabled={scanning} aria-label={t('rescanPage')}>
                    {scanning ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" />}
                  </Button>
                </div>
              </div>

              <div className="p-6 space-y-4">
                <p className="text-xs text-muted-foreground">{t('samplePreviewNote')}</p>
                {/* Stats Row */}
                <div className="grid grid-cols-4 gap-3">
                  {stats.map((stat) => (
                    <div key={stat.label} className="bg-muted/30 rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <stat.icon aria-hidden="true" className={`h-4 w-4 ${statColors[stat.color]}`} />
                        <span className="text-xs text-muted-foreground">{stat.label}</span>
                      </div>
                      <div className="text-2xl font-bold"><AnimatedCounter target={parseInt(stat.value)} /></div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {stat.trend}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Sample trend preview (static illustration) */}
                <div className="bg-muted/30 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-muted-foreground">{t('trendsLabel')}</span>
                    <span className="text-xs text-muted-foreground">{t('samplePreview')}</span>
                  </div>
                  <svg viewBox="0 0 240 64" className="h-24 w-full" role="img" aria-label={t('trendsLabel')}>
                    <defs>
                      <linearGradient id="heroTrend" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--coral)" stopOpacity="0.35" />
                        <stop offset="100%" stopColor="var(--coral)" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                    <polygon
                      points={`0,64 ${sampleTrend.map((v, i) => `${(i / (sampleTrend.length - 1)) * 240},${64 - (v / 45) * 56}`).join(' ')} 240,64`}
                      fill="url(#heroTrend)"
                    />
                    <polyline
                      points={sampleTrend.map((v, i) => `${(i / (sampleTrend.length - 1)) * 240},${64 - (v / 45) * 56}`).join(' ')}
                      fill="none"
                      stroke="var(--coral)"
                      strokeWidth="2"
                      strokeLinejoin="round"
                      strokeLinecap="round"
                    />
                  </svg>
                </div>

                {/* Live findings from the axe-core scan of this page */}
                <div className="space-y-2">
                  {scanning ? (
                    <div className="flex items-center gap-3 p-3 bg-muted/20 rounded-lg text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                      {t('liveScanning')}
                    </div>
                  ) : violations.length === 0 ? (
                    <div className="flex items-center gap-3 p-3 bg-emerald-500/10 rounded-lg text-sm">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                      {t('liveNoFindings')}
                    </div>
                  ) : (
                    violations.map((v) => (
                      <div key={v.id} className="flex items-center gap-3 p-3 bg-muted/20 rounded-lg">
                        <div className={`w-2 h-2 rounded-full shrink-0 ${v.severity === 'critical' ? 'bg-red-500' : v.severity === 'serious' ? 'bg-orange-500' : 'bg-yellow-500'}`} />
                        <span className="text-sm flex-1 truncate">{v.title}</span>
                        <span className="text-xs text-muted-foreground shrink-0">{v.page}</span>
                        <Badge variant="outline" className="text-xs capitalize shrink-0">{v.severity}</Badge>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Floating Elements */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ delay: 0.8, type: 'spring', stiffness: 200 }}
              className="absolute -right-4 top-20 bg-emerald-700 text-white px-4 py-2 rounded-lg shadow-lg text-sm font-medium"
            >
              <Check aria-hidden="true" className="inline h-4 w-4 mr-1" />
              {t('wcagBadge')}
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.8, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ delay: 1, type: 'spring', stiffness: 200 }}
              className="absolute -left-4 bottom-40 bg-card border border-border px-4 py-3 rounded-lg shadow-lg"
            >
              <div className="flex items-center gap-2">
                <Github aria-hidden="true" className="h-5 w-5" />
                <span className="text-sm font-medium">{t('prCreated')}</span>
                <CheckCircle2 aria-hidden="true" className="h-4 w-4 text-emerald-500" />
              </div>
            </motion.div>

            {/* Animated scan line */}
            <motion.div
              className="absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-coral to-transparent"
              initial={{ top: '0%', opacity: 0 }}
              animate={{ top: ['0%', '100%', '0%'], opacity: [0, 0.6, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
            />
          </motion.div>
        </div>
      </div>
    </section>
  );
}
