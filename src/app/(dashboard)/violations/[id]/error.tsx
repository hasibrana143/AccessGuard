'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function ViolationDetailError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();

  return (
    <div className="flex items-center justify-center min-h-[60vh] p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 p-3 rounded-full bg-destructive/10 w-fit">
            <AlertTriangle className="h-8 w-8 text-destructive" />
          </div>
          <CardTitle className="text-xl">Violation Error</CardTitle>
          <CardDescription>Something went wrong loading this violation.</CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <p className="text-sm text-muted-foreground">{error.message}</p>
        </CardContent>
        <CardContent className="flex flex-col gap-2">
          <Button className="w-full" onClick={reset}>Try Again</Button>
          <Button variant="outline" className="w-full" onClick={() => router.push('/violations')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Violations
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
