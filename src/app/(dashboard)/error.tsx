'use client';

import { useEffect } from 'react';
import { Shield, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function DashboardError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center max-w-md px-4">
        <div className="p-3 rounded-xl bg-coral/10 w-fit mx-auto mb-4">
          <Shield className="h-8 w-8 text-coral" />
        </div>
        <h1 className="text-2xl font-bold mb-2">Something went wrong</h1>
        <p className="text-muted-foreground mb-6">
          An unexpected error occurred. Please try again.
        </p>
        <Button onClick={reset} className="bg-coral hover:bg-coral/90 text-coral-foreground">
          <RefreshCw className="h-4 w-4 mr-2" />
          Try Again
        </Button>
      </div>
    </div>
  );
}
