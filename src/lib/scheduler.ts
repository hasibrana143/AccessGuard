// Scheduler utilities for AccessGuard
import { isValidCron, getNextRun } from './cron';

export interface SchedulePreset {
  label: string;
  cron: string;
  description: string;
}

export const SCHEDULE_PRESETS: SchedulePreset[] = [
  { label: 'Hourly', cron: '0 * * * *', description: 'Every hour' },
  { label: 'Daily', cron: '0 2 * * *', description: 'Every day at 2 AM' },
  { label: 'Weekly', cron: '0 2 * * 1', description: 'Every Monday at 2 AM' },
  { label: 'Monthly', cron: '0 2 1 * *', description: '1st of month at 2 AM' },
];

// Validate cron expression (delegates to the full 5-field parser)
export function validateCronExpression(cron: string): boolean {
  return isValidCron(cron);
}

// Get human-readable description of cron
export function getCronDescription(cron: string): string {
  const preset = SCHEDULE_PRESETS.find(p => p.cron === cron);
  if (preset) return preset.description;

  // Basic parsing
  const parts = cron.trim().split(/\s+/);
  if (parts.length !== 5) return 'Custom schedule';

  const [minute, hour, dayOfMonth, month, dayOfWeek] = parts;

  if (minute === '0' && hour === '*') return 'Every hour';
  if (minute === '0' && hour !== '*') return `Daily at ${hour}:00`;
  if (dayOfWeek !== '*') return `Weekly`;
  if (dayOfMonth !== '*') return `Monthly`;

  return 'Custom schedule';
}

// Calculate next run time from cron (delegates to the full implementation in cron.ts)
export function getNextRunTime(cron: string): Date {
  return getNextRun(cron, new Date()) ?? new Date(Date.now() + 60 * 60 * 1000);
}

// Format time until next run
export function getTimeUntilNextRun(nextRun: Date): string {
  const now = new Date();
  const diff = nextRun.getTime() - now.getTime();

  if (diff < 0) return 'Overdue';

  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `in ${days} day${days > 1 ? 's' : ''}`;
  if (hours > 0) return `in ${hours} hour${hours > 1 ? 's' : ''}`;
  if (minutes > 0) return `in ${minutes} minute${minutes > 1 ? 's' : ''}`;
  return 'soon';
}

// Format schedule date
export function formatScheduleDate(date: Date | null): string {
  if (!date) return 'Never';
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// Get scheduler API key (no public fallback — must be configured explicitly)
export function getSchedulerApiKey(): string | null {
  return process.env.SCHEDULER_API_KEY ?? null;
}
