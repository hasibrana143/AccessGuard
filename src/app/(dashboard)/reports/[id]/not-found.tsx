import { DashboardNotFound } from '@/components/dashboard/not-found-card';

export default function ReportNotFound() {
  return (
    <DashboardNotFound
      title="Report Not Found"
      description="This report doesn't exist or has been deleted."
    />
  );
}
