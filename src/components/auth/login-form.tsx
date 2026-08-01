'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Shield, ArrowRight, Eye, EyeOff, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { signIn } from 'next-auth/react';

interface LoginFormProps {
  onBack: () => void;
  onSwitchToRegister: () => void;
}

export function LoginForm({ onBack, onSwitchToRegister }: LoginFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [mfaCode, setMfaCode] = useState('');
  const [mfaRequired, setMfaRequired] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const result = await signIn('credentials', {
        email,
        password,
        mfaCode: mfaRequired ? mfaCode : undefined,
        redirect: false,
      });
      if (result?.ok) {
        toast({ title: 'Welcome back!', description: 'Signed in successfully' });
        router.push('/dashboard');
      } else {
        if (result?.error === 'MFA_REQUIRED') {
          setMfaRequired(true);
          toast({ title: 'Two-Factor Required', description: 'Enter your authenticator app code to continue' });
        } else {
          toast({ title: 'Login Failed', description: result?.error || 'Invalid credentials', variant: 'destructive' });
        }
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
        <Button variant="ghost" onClick={onBack} className="mb-6">
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
            <h1 className="font-semibold leading-none tracking-tight text-2xl">Welcome Back</h1>
            <CardDescription>Sign in to your AccessGuard account</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4" noValidate>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" required autoComplete="email" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input id="password" type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter your password" required autoComplete="current-password" />
                  <Button type="button" variant="ghost" size="sm" className="absolute right-0 top-0 h-full px-3" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? 'Hide password' : 'Show password'}>
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
              {mfaRequired && (
                <div className="space-y-2">
                  <Label htmlFor="mfa-code">Authenticator Code</Label>
                  <Input
                    id="mfa-code"
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={mfaCode}
                    onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, ''))}
                    placeholder="6-digit code"
                    required
                    autoComplete="one-time-code"
                    className="text-center text-lg tracking-[0.3em] font-mono"
                  />
                </div>
              )}
              <Button type="submit" className="w-full bg-coral hover:bg-coral/90 text-coral-foreground h-11" disabled={isLoading}>
                {isLoading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Signing in...</> : mfaRequired ? 'Verify & Sign In' : 'Sign In'}
              </Button>
            </form>
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <Button variant="link" className="text-sm text-muted-foreground" onClick={() => router.push('/auth/forgot-password')}>
              Forgot your password?
            </Button>
            <div className="text-sm text-muted-foreground">
              Don&apos;t have an account?{' '}
              <Button variant="link" className="p-0 h-auto text-coral" onClick={onSwitchToRegister}>Sign up</Button>
            </div>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
