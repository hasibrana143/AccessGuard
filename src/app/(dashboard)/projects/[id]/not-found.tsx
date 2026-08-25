import { DashboardNotFound } from '@/components/dashboard/not-found-card';

export default function ProjectNotFound() {
  return (
    <DashboardNotFound
      title="Project Not Found"
      description="This project doesn't exist or you don't have access."
    />
  );
}
