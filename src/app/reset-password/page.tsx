'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Shield, ArrowRight, Eye, EyeOff, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [token, setToken] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isValidating, setIsValidating] = useState(true);
  const [tokenValid, setTokenValid] = useState<boolean | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const t = searchParams.get('token');
    if (!t) {
      setTokenValid(false);
      setIsValidating(false);
      return;
    }
    setToken(t);
    (async () => {
      try {
        const res = await fetch(`/api/auth/reset-password?token=${encodeURIComponent(t)}`);
        const data = await res.json();
        setTokenValid(data.success);
      } catch {
        setTokenValid(false);
      } finally {
        setIsValidating(false);
      }
    })();
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      toast({ title: 'Weak Password', description: 'Password must be at least 6 characters', variant: 'destructive' });
      return;
    }
    if (password !== confirmPassword) {
      toast({ title: 'Passwords Do Not Match', description: 'Please re-enter your new password', variant: 'destructive' });
      return;
    }
    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (data.success) {
        setDone(true);
        toast({ title: 'Password Reset', description: 'Your password has been updated. Sign in with your new password.' });
      } else {
        toast({ title: 'Reset Failed', description: data.error || 'Invalid or expired token', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to connect to server', variant: 'destructive' });
    } finally {
      setIsLoading(false);
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
            <CardTitle className="text-2xl">Reset Password</CardTitle>
            <CardDescription>Choose a new password for your account</CardDescription>
          </CardHeader>
          <CardContent>
            {isValidating ? (
              <div className="flex flex-col items-center justify-center py-8 gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-coral" />
                <p className="text-sm text-muted-foreground">Validating reset link...</p>
              </div>
            ) : !tokenValid ? (
              <div className="flex flex-col items-center justify-center py-8 gap-3 text-center">
                <AlertCircle className="h-12 w-12 text-destructive" />
                <p className="text-sm text-muted-foreground">
                  This reset link is invalid or has expired. Request a new one.
                </p>
                <Button className="bg-coral hover:bg-coral/90 text-coral-foreground" onClick={() => router.push('/auth/forgot-password')}>
                  Request New Link
                </Button>
              </div>
            ) : done ? (
              <div className="flex flex-col items-center justify-center py-8 gap-3 text-center">
                <CheckCircle2 className="h-12 w-12 text-emerald-500" />
                <p className="text-sm text-muted-foreground">Your password has been reset successfully.</p>
                <Button className="bg-coral hover:bg-coral/90 text-coral-foreground" onClick={() => router.push('/auth/login')}>
                  Sign In
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4" noValidate>
                <div className="space-y-2">
                  <Label htmlFor="password">New Password</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="At least 6 characters"
                      required
                      autoComplete="new-password"
                    />
                    <Button type="button" variant="ghost" size="sm" className="absolute right-0 top-0 h-full px-3" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? 'Hide password' : 'Show password'}>
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm New Password</Label>
                  <Input
                    id="confirmPassword"
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter your new password"
                    required
                    autoComplete="new-password"
                  />
                </div>
                <Button type="submit" className="w-full bg-coral hover:bg-coral/90 text-coral-foreground h-11" disabled={isLoading}>
                  {isLoading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Resetting...</> : 'Reset Password'}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-coral" />
      </div>
    }>
      <ResetPasswordContent />
    </Suspense>
  );
}
