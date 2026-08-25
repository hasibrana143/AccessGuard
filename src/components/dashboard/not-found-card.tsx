'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield, ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface DashboardNotFoundProps {
  title?: string;
  description?: string;
}

export function DashboardNotFound({
  title = 'Page Not Found',
  description = "The page you're looking for doesn't exist or has been moved.",
}: DashboardNotFoundProps) {
  const router = useRouter();

  return (
    <div className="flex items-center justify-center min-h-[60vh] p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 p-3 rounded-full bg-coral/10 w-fit">
            <Shield className="h-8 w-8 text-coral" />
          </div>
          <CardTitle className="text-xl">{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <div className="text-6xl font-bold text-muted-foreground/30 mb-4">404</div>
        </CardContent>
        <CardFooter className="flex flex-col gap-2">
          <Button
            className="w-full bg-coral hover:bg-coral/90 text-coral-foreground"
            onClick={() => router.push('/dashboard')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
          <Button
            variant="outline"
            className="w-full"
            onClick={() => router.back()}
          >
            Go Back
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
