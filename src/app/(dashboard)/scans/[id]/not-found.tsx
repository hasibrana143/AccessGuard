import { DashboardNotFound } from '@/components/dashboard/not-found-card';

export default function ScanNotFound() {
  return (
    <DashboardNotFound
      title="Scan Not Found"
      description="This scan doesn't exist or has been deleted."
    />
  );
}
