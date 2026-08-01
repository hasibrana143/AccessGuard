'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Shield, ArrowRight, Loader2, CheckCircle2, AlertCircle, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';

function VerifyEmailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
  const [resending, setResending] = useState(false);

  useEffect(() => {
    const token = searchParams.get('token');
    if (!token) {
      setStatus('error');
      return;
    }
    (async () => {
      try {
        const res = await fetch(`/api/auth/verify-email?token=${encodeURIComponent(token)}`);
        const data = await res.json();
        setStatus(data.success ? 'success' : 'error');
        if (data.success) {
          toast({ title: 'Email Verified', description: 'Your email has been confirmed.' });
        }
      } catch {
        setStatus('error');
      }
    })();
  }, [searchParams, toast]);

  const handleResend = async () => {
    setResending(true);
    try {
      const email = searchParams.get('email');
      if (!email) {
        toast({ title: 'Error', description: 'Email not found. Go to Settings > Profile to resend.', variant: 'destructive' });
        return;
      }
      const res = await fetch('/api/auth/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (data.success) {
        toast({ title: 'Verification Email Sent', description: data.demoToken ? `Demo token: ${data.demoToken}` : 'Check your inbox.' });
      } else {
        toast({ title: 'Error', description: data.error || 'Failed to resend', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to resend verification email', variant: 'destructive' });
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-coral/5 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Button variant="ghost" onClick={() => router.push('/')} className="mb-6">
          <ArrowRight className="h-4 w-4 mr-2 rotate-180" />
          Back to Home
        </Button>
        <Card className="border-2">
          <CardHeader className="text-center">
            <div className="flex items-center justify-center gap-2 mb-4">
              <div className="p-2 rounded-lg bg-coral/10">
                <Shield className="h-8 w-8 text-coral" />
              </div>
            </div>
            <CardTitle className="text-2xl">Email Verification</CardTitle>
            <CardDescription>Confirm your email address</CardDescription>
          </CardHeader>
          <CardContent>
            {status === 'verifying' && (
              <div className="flex flex-col items-center justify-center py-8 gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-coral" />
                <p className="text-sm text-muted-foreground">Verifying your email...</p>
              </div>
            )}
            {status === 'success' && (
              <div className="flex flex-col items-center justify-center py-8 gap-3 text-center">
                <CheckCircle2 className="h-12 w-12 text-emerald-500" />
                <p className="font-medium">Email verified!</p>
                <p className="text-sm text-muted-foreground">Your account is fully activated.</p>
                <Button className="bg-coral hover:bg-coral/90 text-coral-foreground" onClick={() => router.push('/auth/login')}>
                  Go to Login
                </Button>
              </div>
            )}
            {status === 'error' && (
              <div className="flex flex-col items-center justify-center py-8 gap-3 text-center">
                <AlertCircle className="h-12 w-12 text-destructive" />
                <p className="font-medium">Verification failed</p>
                <p className="text-sm text-muted-foreground">
                  This link is invalid or has expired. Resend a new verification email.
                </p>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={handleResend} disabled={resending}>
                    {resending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Sending...</> : <><Mail className="h-4 w-4 mr-2" />Resend Email</>}
                  </Button>
                  <Button className="bg-coral hover:bg-coral/90 text-coral-foreground" onClick={() => router.push('/auth/login')}>
                    Go to Login
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-coral" />
      </div>
    }>
      <VerifyEmailContent />
    </Suspense>
  );
}
