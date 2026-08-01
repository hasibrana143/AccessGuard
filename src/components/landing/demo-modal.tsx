'use client';

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
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl w-[90vw] p-0 overflow-hidden">
        <DialogHeader className="sr-only">
          <DialogTitle>AccessGuard Demo</DialogTitle>
          <DialogDescription>Watch a 2-minute demo of AccessGuard in action</DialogDescription>
        </DialogHeader>
        <div className="relative bg-black aspect-video">
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-center text-white">
              <div className="w-20 h-20 rounded-full bg-white/10 flex items-center justify-center mx-auto mb-4 backdrop-blur">
                <Play className="h-10 w-10 text-white ml-1" />
              </div>
              <p className="text-lg font-medium">2-Minute Product Demo</p>
              <p className="text-sm text-white/60 mt-1">See how AccessGuard scans, detects, and fixes accessibility issues</p>
            </div>
          </div>
          <video
            className="w-full h-full object-cover"
            poster="/demo-poster.png"
            controls
            playsInline
            aria-label="AccessGuard product demo showing scan, detection, and fix workflow"
          >
            <source src="/demo.mp4" type="video/mp4" />
            Your browser does not support the video tag.
          </video>
        </div>
        <div className="p-6 bg-card">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold">Ready to try it yourself?</h3>
              <p className="text-sm text-muted-foreground">Start your free 14-day trial in minutes</p>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
              <Button onClick={() => { onOpenChange(false); onGetStarted(); }} className="bg-coral hover:bg-coral/90 text-coral-foreground">
                Start Free Trial
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
