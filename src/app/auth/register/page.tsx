'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { RegisterForm } from '@/components/auth/register-form';

export default function RegisterPage() {
  const router = useRouter();

  return (
    <RegisterForm
      onBack={() => router.push('/')}
      onSwitchToLogin={() => router.push('/auth/login')}
    />
  );
}
