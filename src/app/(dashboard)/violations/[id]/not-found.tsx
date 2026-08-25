import { DashboardNotFound } from '@/components/dashboard/not-found-card';

export default function ViolationNotFound() {
  return (
    <DashboardNotFound
      title="Violation Not Found"
      description="This violation doesn't exist or has been deleted."
    />
  );
}
