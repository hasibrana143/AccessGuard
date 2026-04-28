'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield, Home, ArrowLeft } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-slate-800/50 border-slate-700">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4">
            <Shield className="h-12 w-12 text-coral" />
          </div>
          <CardTitle className="text-2xl text-white">Page Not Found</CardTitle>
          <CardDescription className="text-slate-400">
            The page you're looking for doesn't exist or has been moved.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <div className="text-6xl font-bold text-slate-700 mb-4">404</div>
        </CardContent>
        <CardFooter className="flex flex-col gap-2">
          <Button
            className="w-full bg-coral hover:bg-coral/90"
            onClick={() => window.location.href = '/'}
          >
            <Home className="h-4 w-4 mr-2" />
            Go Home
          </Button>
          <Button
            variant="outline"
            className="w-full border-slate-600 text-slate-300"
            onClick={() => window.history.back()}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Go Back
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
