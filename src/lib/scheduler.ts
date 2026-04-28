// Scheduler utilities for AccessGuard
import { ScheduledScan } from '@prisma/client';

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

// Validate cron expression (basic check)
export function validateCronExpression(cron: string): boolean {
  const parts = cron.trim().split(/\s+/);
  return parts.length === 5;
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

// Calculate next run time from cron (simplified)
export function getNextRunTime(cron: string): Date {
  const parts = cron.trim().split(/\s+/);
  if (parts.length !== 5) return new Date();

  const [minute, hour, dayOfMonth, month, dayOfWeek] = parts;
  const now = new Date();
  const next = new Date(now);

  // Simple logic for common patterns
  if (hour === '*') {
    // Hourly - next hour
    next.setHours(next.getHours() + 1, parseInt(minute) || 0, 0, 0);
  } else if (dayOfWeek !== '*') {
    // Weekly - next occurrence of day
    const targetDay = parseInt(dayOfWeek);
    const currentDay = next.getDay();
    const daysUntil = (targetDay - currentDay + 7) % 7 || 7;
    next.setDate(next.getDate() + daysUntil);
    next.setHours(parseInt(hour) || 2, parseInt(minute) || 0, 0, 0);
  } else if (dayOfMonth !== '*') {
    // Monthly - next occurrence of day
    const targetDate = parseInt(dayOfMonth);
    if (next.getDate() >= targetDate) {
      next.setMonth(next.getMonth() + 1);
    }
    next.setDate(targetDate);
    next.setHours(parseInt(hour) || 2, parseInt(minute) || 0, 0, 0);
  } else {
    // Daily
    const targetHour = parseInt(hour) || 2;
    if (next.getHours() >= targetHour) {
      next.setDate(next.getDate() + 1);
    }
    next.setHours(targetHour, parseInt(minute) || 0, 0, 0);
  }

  return next;
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
