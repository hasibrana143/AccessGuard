'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Globe, Github, Search, ArrowRight, Sparkles, LayoutDashboard, Bell, FileText } from 'lucide-react';

export default function OnboardingWizard() {
  const t = useTranslations('onboarding');
  const steps = [
    {
      title: t('step1Title'),
      description: t('step1Desc'),
      icon: Sparkles,
      action: t('step1Action'),
    },
    {
      title: t('step2Title'),
      description: t('step2Desc'),
      icon: Globe,
      action: t('step2Action'),
    },
    {
      title: t('step3Title'),
      description: t('step3Desc'),
      icon: Github,
      action: t('step3Action'),
    },
    {
      title: t('step4Title'),
      description: t('step4Desc'),
      icon: Search,
      action: t('step4Action'),
    },
  ];

  const tutorialPoints = [
    { icon: LayoutDashboard, text: t('tour1') },
    { icon: Search, text: t('tour2') },
    { icon: Sparkles, text: t('tour3') },
    { icon: Bell, text: t('tour4') },
    { icon: FileText, text: t('tour5') },
  ];

  const [step, setStep] = useState(0);
  const [dismissed, setDismissed] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const seen = localStorage.getItem('onboarding-seen');
    if (!seen) setDismissed(false);
  }, []);

  if (dismissed) return null;

  const current = steps[step];
  const isTutorial = step === steps.length;

  function next() {
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

  function skip() {
    localStorage.setItem('onboarding-seen', 'true');
    setDismissed(true);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-card border border-border rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl">
        <div className="flex justify-between items-center mb-6">
          <div className="flex gap-1">
            {(isTutorial ? steps : steps.slice(0, Math.max(step, 1))).map((_, i) => (
              <div
                key={i}
                className={`h-1.5 w-8 rounded-full transition-colors ${
                  isTutorial || i === step ? 'bg-coral' : i < step ? 'bg-emerald-500' : 'bg-border'
                }`}
              />
            ))}
          </div>
          <button onClick={skip} className="text-sm text-muted-foreground hover:text-foreground">
            {t('skip')}
          </button>
        </div>

        {!isTutorial ? (
          <div className="flex flex-col items-center text-center mb-8">
            <div className="p-4 rounded-full bg-coral/10 mb-4">
              <current.icon className="h-8 w-8 text-coral" />
            </div>
            <h2 className="text-xl font-bold mb-2">{current.title}</h2>
            <p className="text-muted-foreground">{current.description}</p>
          </div>
        ) : (
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-4">
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
                <li key={i} className="flex items-start gap-3">
                  <div className="p-1.5 rounded-lg bg-muted flex-shrink-0">
                    <point.icon className="h-4 w-4 text-coral" />
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">{point.text}</p>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={skip}
            className="flex-1 py-3 rounded-lg border border-border text-sm font-medium hover:bg-secondary"
          >
            {step === steps.length ? t('dashboard') : t('skipTour')}
          </button>
          <button
            onClick={next}
            className="flex-1 py-3 rounded-lg bg-coral text-coral-foreground text-sm font-semibold hover:bg-coral/90 flex items-center justify-center gap-2"
          >
            {isTutorial ? t('startScanning') : current.action}
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
