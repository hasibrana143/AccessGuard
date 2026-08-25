import { Skeleton } from '@/components/ui/skeleton';

export default function AuditLogsLoading() {
  return (
    <div className="space-y-6 p-6">
      <Skeleton className="h-8 w-40" />
      <div className="space-y-2">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 rounded border p-3">
            <Skeleton className="h-6 w-6 rounded" />
            <Skeleton className="h-4 flex-1" />
            <Skeleton className="h-4 w-32" />
          </div>
        ))}
      </div>
    </div>
  );
}
