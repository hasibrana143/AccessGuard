'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Global error:', error);
  }, [error]);

  return (
    <html lang="en" className="dark">
      <body className="bg-background text-foreground">
        <div className="min-h-screen flex items-center justify-center p-4">
          <Card className="w-full max-w-lg border-destructive/50">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 p-3 rounded-full bg-destructive/10 w-fit">
                <AlertTriangle className="h-8 w-8 text-destructive" />
              </div>
              <CardTitle className="text-xl">Critical Error</CardTitle>
              <CardDescription>
                A critical error occurred. The application needs to be reloaded.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {process.env.NODE_ENV === 'development' && (
                <div className="p-3 rounded-lg bg-muted text-sm font-mono overflow-auto max-h-40 text-muted-foreground">
                  <p className="text-destructive">{error.message}</p>
                  {error.digest && (
                    <p className="text-xs mt-2">Error ID: {error.digest}</p>
                  )}
                </div>
              )}
            </CardContent>
            <CardFooter className="flex flex-col gap-2">
              <Button onClick={reset} className="w-full">
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again
              </Button>
              <Button variant="outline" onClick={() => window.location.href = '/'} className="w-full">
                <Home className="h-4 w-4 mr-2" />
                Go Home
              </Button>
            </CardFooter>
          </Card>
        </div>
      </body>
    </html>
  );
}
