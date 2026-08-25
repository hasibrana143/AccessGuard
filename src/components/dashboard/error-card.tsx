'use client';

import { useEffect } from 'react';
import * as Sentry from '@sentry/nextjs';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, RefreshCw, ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface DashboardErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
  title?: string;
}

export function DashboardError({
  error,
  reset,
  title = 'Something went wrong',
}: DashboardErrorProps) {
  const router = useRouter();

  useEffect(() => {
    Sentry.captureException(error, { tags: { digest: error.digest ?? 'none', boundary: 'error-card' } });
  }, [error]);

  return (
    <div className="flex items-center justify-center min-h-[60vh] p-4">
      <Card className="w-full max-w-md border-destructive/30">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 p-3 rounded-full bg-destructive/10 w-fit">
            <AlertTriangle className="h-8 w-8 text-destructive" />
          </div>
          <CardTitle className="text-xl">{title}</CardTitle>
          <CardDescription>
            An unexpected error occurred. Please try again.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {process.env.NODE_ENV === 'development' && (
            <div className="p-3 rounded-lg bg-muted text-sm font-mono overflow-auto max-h-32">
              <p className="text-destructive text-xs">{error.message}</p>
              {error.digest && (
                <p className="text-muted-foreground text-xs mt-2">Error ID: {error.digest}</p>
              )}
            </div>
          )}
        </CardContent>
        <CardFooter className="flex flex-col gap-2">
          <Button onClick={reset} className="w-full">
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </Button>
          <Button
            variant="outline"
            className="w-full"
            onClick={() => router.push('/dashboard')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
