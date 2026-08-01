'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { LoginForm } from '@/components/auth/login-form';

export default function LoginPage() {
  const router = useRouter();

  return (
    <LoginForm
      onBack={() => router.push('/')}
      onSwitchToRegister={() => router.push('/auth/register')}
    />
  );
}
