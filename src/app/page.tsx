'use client';

import { useState } from 'react';
import { Shield } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Hero } from '@/components/landing/hero';
import { TrustIndicators } from '@/components/landing/trust-indicators';
import { Features } from '@/components/landing/features';
import { Testimonials } from '@/components/landing/testimonials';
import { Comparison } from '@/components/landing/comparison';
import { Pricing } from '@/components/landing/pricing';
import { FAQ } from '@/components/landing/faq';
import { CTA } from '@/components/landing/cta';
import { Privacy } from '@/components/landing/privacy';
import { FooterSection } from '@/components/landing/footer-section';
import { DemoModal } from '@/components/landing/demo-modal';

export default function LandingPage() {
  const [showDemo, setShowDemo] = useState(false);
  const router = useRouter();
  const { isAuthenticated } = useAuth();

  const handleGetStarted = () => {
    if (isAuthenticated) {
      router.push('/dashboard');
    } else {
      router.push('/auth/login');
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <Shield className="h-8 w-8 text-coral" />
              <span className="text-xl font-bold">AccessGuard</span>
              <Badge variant="outline" className="ml-2 border-emerald-500/20 text-emerald-500 text-xs">
                Lawsuit Defense Ready&trade;
              </Badge>
            </div>
            <div className="hidden md:flex items-center gap-8">
              <a href="#features" className="text-muted-foreground hover:text-foreground transition-colors">Features</a>
              <a href="#comparison" className="text-muted-foreground hover:text-foreground transition-colors">Comparison</a>
              <a href="#pricing" className="text-muted-foreground hover:text-foreground transition-colors">Pricing</a>
              <a href="#faq" className="text-muted-foreground hover:text-foreground transition-colors">FAQ</a>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="ghost" onClick={handleGetStarted}>Sign In</Button>
              <Button onClick={handleGetStarted} className="bg-coral hover:bg-coral/90 text-coral-foreground">
                Start Free Trial
              </Button>
            </div>
          </div>
        </div>
      </nav>
      <Hero onGetStarted={handleGetStarted} onWatchDemo={() => setShowDemo(true)} />
      <TrustIndicators />
      <Features />
      <Testimonials />
      <Comparison />
      <Pricing onGetStarted={handleGetStarted} />
      <FAQ />
      <CTA onGetStarted={handleGetStarted} />
      <Privacy />
      <FooterSection />
      <DemoModal open={showDemo} onOpenChange={setShowDemo} onGetStarted={handleGetStarted} />
    </div>
  );
}
