'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { motion, AnimatePresence } from 'framer-motion';
import { Globe, Github, Search, ArrowRight, Sparkles, LayoutDashboard, Bell, FileText, CheckCircle } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

export default function OnboardingWizard() {
  const t = useTranslations('onboarding');
  const steps = [
    {
      title: t('step1Title'),
      description: t('step1Desc'),
      icon: Sparkles,
      action: t('step1Action'),
      color: 'coral',
    },
    {
      title: t('step2Title'),
      description: t('step2Desc'),
      icon: Globe,
      action: t('step2Action'),
      color: 'emerald',
    },
    {
      title: t('step3Title'),
      description: t('step3Desc'),
      icon: Github,
      action: t('step3Action'),
      color: 'blue',
    },
    {
      title: t('step4Title'),
      description: t('step4Desc'),
      icon: Search,
      action: t('step4Action'),
      color: 'coral',
    },
  ];

  const tutorialPoints = [
    { icon: LayoutDashboard, text: t('tour1'), highlight: true },
    { icon: Search, text: t('tour2'), highlight: false },
    { icon: Sparkles, text: t('tour3'), highlight: true },
    { icon: Bell, text: t('tour4'), highlight: false },
    { icon: FileText, text: t('tour5'), highlight: true },
  ];

  const [step, setStep] = useState(0);
  const [dismissed, setDismissed] = useState(true);
  const [direction, setDirection] = useState(1);
  const router = useRouter();

  useEffect(() => {
    const seen = localStorage.getItem('onboarding-seen');
    if (!seen) setDismissed(false);
  }, []);

  if (dismissed) return null;

  const current = steps[step];
  const isTutorial = step === steps.length;
  const totalSteps = steps.length + 1;
  const progress = ((step + 1) / totalSteps) * 100;

  function next() {
    setDirection(1);
    if (step < steps.length - 1) {
      setStep(step + 1);
    } else if (step === steps.length - 1) {
      setStep(steps.length);
    } else {
      localStorage.setItem('onboarding-seen', 'true');
      setDismissed(true);
      router.push('/projects?new=1');
    }
  }

  function prev() {
    setDirection(-1);
    if (step > 0) {
      setStep(step - 1);
    }
  }

  function skip() {
    localStorage.setItem('onboarding-seen', 'true');
    setDismissed(true);
  }

  const colorClasses: Record<string, string> = {
    coral: 'bg-coral/10 text-coral',
    emerald: 'bg-emerald-500/10 text-emerald-500',
    blue: 'bg-blue-500/10 text-blue-500',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-card border border-border rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl"
      >
        {/* Progress bar */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs text-muted-foreground">
              Step {step + 1} of {totalSteps}
            </span>
            <button onClick={skip} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              {t('skip')}
            </button>
          </div>
          <Progress value={progress} className="h-1.5" />
        </div>

        <AnimatePresence mode="wait" custom={direction}>
          {!isTutorial ? (
            <motion.div
              key={`step-${step}`}
              custom={direction}
              initial={{ opacity: 0, x: direction * 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: direction * -50 }}
              transition={{ duration: 0.2 }}
              className="flex flex-col items-center text-center mb-8"
            >
              <div className={`p-4 rounded-full mb-4 ${colorClasses[current.color]}`}>
                <current.icon className="h-8 w-8" />
              </div>
              <h2 className="text-xl font-bold mb-2">{current.title}</h2>
              <p className="text-muted-foreground max-w-sm">{current.description}</p>
            </motion.div>
          ) : (
            <motion.div
              key="tutorial"
              custom={direction}
              initial={{ opacity: 0, x: direction * 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: direction * -50 }}
              transition={{ duration: 0.2 }}
              className="mb-8"
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 rounded-full bg-coral/10">
                  <LayoutDashboard className="h-6 w-6 text-coral" />
                </div>
                <div>
                  <h2 className="text-xl font-bold">{t('quickTour')}</h2>
                  <p className="text-sm text-muted-foreground">{t('quickTourSub')}</p>
                </div>
              </div>
              <ul className="space-y-3">
                {tutorialPoints.map((point, i) => (
                  <motion.li
                    key={i}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="flex items-start gap-3"
                  >
                    <div className={`p-1.5 rounded-lg flex-shrink-0 ${point.highlight ? 'bg-coral/10' : 'bg-muted'}`}>
                      <point.icon className={`h-4 w-4 ${point.highlight ? 'text-coral' : 'text-muted-foreground'}`} />
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed">{point.text}</p>
                  </motion.li>
                ))}
              </ul>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex gap-3">
          {step > 0 && (
            <button
              onClick={prev}
              className="flex-1 py-3 rounded-lg border border-border text-sm font-medium hover:bg-secondary transition-colors"
            >
              Back
            </button>
          )}
          <button
            onClick={isTutorial ? skip : next}
            className="flex-1 py-3 rounded-lg bg-coral text-coral-foreground text-sm font-semibold hover:bg-coral/90 flex items-center justify-center gap-2 transition-colors"
          >
            {isTutorial ? t('startScanning') : current.action}
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </motion.div>
    </div>
  );
}
