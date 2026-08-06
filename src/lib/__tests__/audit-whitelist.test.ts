import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'fs';
import { join } from 'path';
import { AUDIT_ACTIONS } from '@/lib/audit';

// AGENTS.md hard rule: "New audit events MUST be added to the whitelist type
// in src/lib/audit.ts." This test walks every route handler plus the queue and
// scheduler daemon and pins that every emitted audit `action` literal is in
// the whitelist — silent drift (routes calling db.auditLog.create directly)
// now fails CI instead of rotting.

const whitelist = new Set<string>(AUDIT_ACTIONS);
const ACTION_RE = /action:\s*['"]([a-z0-9_.]+)['"]/g;

function collectFiles(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      collectFiles(full, acc);
    } else if (entry === 'route.ts' || entry === 'route.tsx') {
      acc.push(full);
    }
  }
  return acc;
}

const targets = [
  ...collectFiles(join(process.cwd(), 'src/app/api')),
  join(process.cwd(), 'src/lib/queue.ts'),
  join(process.cwd(), 'src/lib/scheduler-daemon.ts'),
];

describe('audit whitelist parity (AGENTS hard rule)', () => {
  it('every audit action emitted by the app is whitelisted', () => {
    const emitted = new Map<string, string[]>();
    for (const file of targets) {
      const source = readFileSync(file, 'utf8');
      for (const match of source.matchAll(ACTION_RE)) {
        const action = match[1];
        if (!whitelist.has(action)) {
          const rel = file.replace(`${process.cwd()}\\`, '').replace(`${process.cwd()}/`, '');
          emitted.set(action, [...(emitted.get(action) ?? []), rel]);
        }
      }
    }
    expect(Object.fromEntries(emitted)).toEqual({});
  });

  it('whitelist contains no duplicates', () => {
    const counts = new Map<string, number>();
    for (const a of AUDIT_ACTIONS) counts.set(a, (counts.get(a) ?? 0) + 1);
    const dupes = [...counts.entries()].filter(([, n]) => n > 1).map(([a]) => a);
    expect(dupes).toEqual([]);
  });
});
