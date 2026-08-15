'use client';

import { useTranslations } from 'next-intl';
import { Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export function DemoModal({
  open,
  onOpenChange = () => {},
  onGetStarted = () => {},
}: {
  open: boolean;
  onOpenChange?: (open: boolean) => void;
  onGetStarted?: () => void;
}) {
  const t = useTranslations('landing');
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl w-[90vw] p-0 overflow-hidden">
        <DialogHeader className="sr-only">
          <DialogTitle>{t('demoTitle')}</DialogTitle>
          <DialogDescription>{t('demoDesc')}</DialogDescription>
        </DialogHeader>
        <div className="relative bg-black aspect-video">
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-center text-white">
              <div className="w-20 h-20 rounded-full bg-white/10 flex items-center justify-center mx-auto mb-4 backdrop-blur">
                <Play className="h-10 w-10 text-white ml-1" />
              </div>
              <p className="text-lg font-medium">{t('demoLabel')}</p>
              <p className="text-sm text-white/60 mt-1">{t('demoSub')}</p>
            </div>
          </div>
          <video
            className="w-full h-full object-cover"
            poster="/demo-poster.png"
            controls
            playsInline
            aria-label={t('videoAria')}
          >
            <source src="/demo.mp4" type="video/mp4" />
            {t('videoUnsupported')}
          </video>
        </div>
        <div className="p-6 bg-card">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold">{t('readyToTry')}</h3>
              <p className="text-sm text-muted-foreground">{t('trialPrompt')}</p>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => onOpenChange(false)}>{t('close')}</Button>
              <Button onClick={() => { onOpenChange(false); onGetStarted(); }} className="bg-coral hover:bg-coral/90 text-coral-foreground">
                {t('startFreeTrial')}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
