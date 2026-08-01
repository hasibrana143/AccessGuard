// Minimal 5-field cron parser and next-run calculator.
// Fields: minute(0-59) hour(0-23) day-of-month(1-31) month(1-12) day-of-week(0-7, 0=Sunday)
// Supports: *, */n, a-b, a-b/n, comma lists. '?' treated as '*'.

export interface CronFields {
  minutes: Set<number>;
  hours: Set<number>;
  daysOfMonth: Set<number>;
  months: Set<number>;
  daysOfWeek: Set<number>;
  domWildcard: boolean;
  dowWildcard: boolean;
}

const DOW_NAMES: Record<string, number> = {
  SUN: 0, MON: 1, TUE: 2, WED: 3, THU: 4, FRI: 5, SAT: 6,
  SUNDAY: 0, MONDAY: 1, TUESDAY: 2, WEDNESDAY: 3, THURSDAY: 4, FRIDAY: 5, SATURDAY: 6,
};

function expandField(token: string, min: number, max: number): Set<number> | null {
  if (token === '*' || token === '?') {
    return new Set(Array.from({ length: max - min + 1 }, (_, i) => min + i));
  }
  const results = new Set<number>();
  for (const part of token.split(',')) {
    if (!part) return null;
    const stepMatch = /^(\*|\d+|\d+-\d+)(?:\/(\d+))?$/.exec(part);
    if (!stepMatch) return null;
    let start: number;
    let end: number;
    if (stepMatch[1] === '*') {
      start = min;
      end = max;
    } else if (stepMatch[1].includes('-')) {
      const [a, b] = stepMatch[1].split('-').map(Number);
      start = a;
      end = b;
      if (a > b || a < min || b > max) return null;
    } else {
      start = Number(stepMatch[1]);
      end = start;
      if (start < min || start > max) return null;
    }
    const step = stepMatch[2] ? Number(stepMatch[2]) : 1;
    if (step < 1) return null;
    for (let v = start; v <= end; v += step) {
      if (v < min || v > max) return null;
      results.add(v);
    }
  }
  return results;
}

function normalizeDowToken(token: string): string {
  return token
    .split(',')
    .map((part) => {
      const base = part.toUpperCase().replace(/^\/.*$/, '');
      const nameMatch = /^([A-Z]{3,})/.exec(base);
      if (nameMatch && DOW_NAMES[nameMatch[1]] !== undefined) {
        return String(DOW_NAMES[nameMatch[1]]) + part.slice(nameMatch[1].length);
      }
      return part;
    })
    .join(',');
}

export function parseCron(expr: string): CronFields | null {
  const parts = expr.trim().split(/\s+/);
  if (parts.length !== 5) return null;

  const minutes = expandField(parts[0], 0, 59);
  const hours = expandField(parts[1], 0, 23);
  const daysOfMonth = expandField(parts[2], 1, 31);
  const months = expandField(parts[3], 1, 12);
  const daysOfWeek = expandField(normalizeDowToken(parts[4]), 0, 7);

  if (!minutes || !hours || !daysOfMonth || !months || !daysOfWeek) return null;

  const domWildcard = parts[2] === '*' || parts[2] === '?';
  const dowWildcard = parts[4] === '*' || parts[4] === '?';

  // Normalize 7 -> 0 for Sunday
  const normalizedDow = new Set<number>();
  for (const d of daysOfWeek) {
    normalizedDow.add(d === 7 ? 0 : d);
  }

  return { minutes, hours, daysOfMonth, months, daysOfWeek: normalizedDow, domWildcard, dowWildcard };
}

function matchesDate(fields: CronFields, date: Date): boolean {
  const domMatches = fields.daysOfMonth.has(date.getDate());
  const dowMatches = fields.daysOfWeek.has(date.getDay());

  let dayMatches: boolean;
  if (fields.domWildcard && fields.dowWildcard) {
    dayMatches = true;
  } else if (fields.domWildcard) {
    dayMatches = dowMatches;
  } else if (fields.dowWildcard) {
    dayMatches = domMatches;
  } else {
    dayMatches = domMatches || dowMatches;
  }

  return (
    fields.months.has(date.getMonth() + 1) &&
    dayMatches &&
    fields.hours.has(date.getHours()) &&
    fields.minutes.has(date.getMinutes())
  );
}

export function getNextRun(expr: string, from: Date, horizonMs = 5 * 365 * 24 * 60 * 60 * 1000): Date | null {
  const fields = parseCron(expr);
  if (!fields) return null;

  const candidate = new Date(from);
  candidate.setSeconds(0, 0);
  candidate.setMinutes(candidate.getMinutes() + 1);

  const deadline = from.getTime() + horizonMs;
  while (candidate.getTime() <= deadline) {
    if (matchesDate(fields, candidate)) {
      return candidate;
    }
    candidate.setMinutes(candidate.getMinutes() + 1);
  }
  return null;
}

export function isValidCron(expr: string): boolean {
  return parseCron(expr) !== null;
}

export function getNextRunForSchedule(
  schedule: { frequency: string; cron: string },
  from: Date
): Date | null {
  if (schedule.cron && isValidCron(schedule.cron)) {
    return getNextRun(schedule.cron, from);
  }
  return getNextRunForFrequency(schedule.frequency, from);
}

export function getNextRunForFrequency(frequency: string, from: Date): Date {
  switch (frequency) {
    case 'daily':
      return new Date(from.getTime() + 24 * 60 * 60 * 1000);
    case 'monthly':
      return new Date(from.getTime() + 30 * 24 * 60 * 60 * 1000);
    case 'weekly':
    default:
      return new Date(from.getTime() + 7 * 24 * 60 * 60 * 1000);
  }
}
