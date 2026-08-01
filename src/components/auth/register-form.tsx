'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Shield, ArrowRight, Eye, EyeOff, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';

interface RegisterFormProps {
  onBack: () => void;
  onSwitchToLogin: () => void;
}

export function RegisterForm({ onBack, onSwitchToLogin }: RegisterFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [organization, setOrganization] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast({
        title: 'Error',
        description: 'Passwords do not match',
        variant: 'destructive',
      });
      return;
    }

    if (password.length < 8) {
      toast({
        title: 'Error',
        description: 'Password must be at least 8 characters',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, organizationName: organization }),
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: 'Account Created!',
          description: 'Welcome to AccessGuard',
        });
        const token = data.demoVerificationToken;
        if (token) {
          toast({
            title: 'Verify Your Email',
            description: `Demo mode — verification token: ${token}`,
          });
        } else {
          toast({
            title: 'Verify Your Email',
            description: 'A verification link has been sent to your inbox.',
          });
        }
        router.push('/dashboard');
      } else {
        toast({
          title: 'Registration Failed',
          description: data.error || 'Could not create account',
          variant: 'destructive',
        });
      }
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to connect to server',
        variant: 'destructive',
      });
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
            <CardTitle className="text-2xl">Create Account</CardTitle>
            <CardDescription>Start your 14-day free trial</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleRegister} className="space-y-4" noValidate>
              <div className="space-y-2">
                <Label htmlFor="register-name">Full Name</Label>
                <Input id="register-name" type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="John Doe" required autoComplete="name" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="register-email">Email</Label>
                <Input id="register-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" required autoComplete="email" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="register-org">Organization Name</Label>
                <Input id="register-org" type="text" value={organization} onChange={(e) => setOrganization(e.target.value)} placeholder="Acme Inc." autoComplete="organization" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="register-password">Password</Label>
                <div className="relative">
                  <Input id="register-password" type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 8 characters" required autoComplete="new-password" />
                  <Button type="button" variant="ghost" size="sm" className="absolute right-0 top-0 h-full px-3" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? 'Hide password' : 'Show password'}>
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="register-confirm">Confirm Password</Label>
                <div className="relative">
                  <Input id="register-confirm" type={showPassword ? 'text' : 'password'} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Confirm your password" required autoComplete="new-password" />
                </div>
              </div>
              <Button type="submit" className="w-full bg-coral hover:bg-coral/90 text-coral-foreground h-11" disabled={isLoading}>
                {isLoading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Creating account...</> : 'Create Account'}
              </Button>
            </form>
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <p className="text-xs text-center text-muted-foreground">
              By creating an account, you agree to our{' '}
              <Button variant="link" className="p-0 h-auto text-xs" onClick={() => router.push('/terms')}>Terms of Service</Button>
              {' '}and{' '}
              <Button variant="link" className="p-0 h-auto text-xs" onClick={() => router.push('/privacy')}>Privacy Policy</Button>
            </p>
            <div className="text-sm text-muted-foreground">
              Already have an account?{' '}
              <Button variant="link" className="p-0 h-auto text-coral" onClick={onSwitchToLogin}>Sign in</Button>
            </div>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
