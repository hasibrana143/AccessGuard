'use client';

import { useEffect } from 'react';
import * as Sentry from '@sentry/nextjs';
import { Shield, RefreshCw, Home, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function DashboardError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    if (error) {
      Sentry.captureException(error, { tags: { digest: error.digest ?? 'none', boundary: 'dashboard' } });
    }
  }, [error, error?.digest]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center max-w-md px-4">
        <div className="p-3 rounded-xl bg-destructive/10 w-fit mx-auto mb-4">
          <Shield className="h-8 w-8 text-destructive" />
        </div>
        <h1 className="text-2xl font-bold mb-2">Something went wrong</h1>
        <p className="text-muted-foreground mb-2">
          An unexpected error occurred while loading this page.
        </p>
        {error?.digest && (
          <p className="text-xs text-muted-foreground mb-4 font-mono">
            Error ID: {error.digest}
          </p>
        )}
        <p className="text-sm text-muted-foreground mb-6">
          Please try again or go back to the dashboard.
        </p>
        <div className="flex flex-col gap-2">
          <Button onClick={reset} className="w-full">
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => window.history.back()} className="flex-1">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Go Back
            </Button>
            <Button variant="outline" onClick={() => window.location.href = '/dashboard'} className="flex-1">
              <Home className="h-4 w-4 mr-2" />
              Dashboard
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
