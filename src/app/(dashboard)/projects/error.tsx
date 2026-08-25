'use client';

import { DashboardError } from '@/components/dashboard/error-card';

export default function PageError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <DashboardError error={error} reset={reset} />;
}
