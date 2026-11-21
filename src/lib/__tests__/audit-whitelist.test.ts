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

// Only audit writes count. Other subsystems keep their own `action` fields
// (e.g. IntegrationLog.action = 'test' | 'create_issue' | 'notify'), so a
// blanket `action:` scan produced false positives and would have polluted the
// audit taxonomy with non-audit values. Anchor on the audit write itself and
// read the action literal from inside that call's argument list.
const AUDIT_CALL_MARKERS = ['createAuditLog(', 'auditLog.create('];

function extractAuditActions(source: string): string[] {
  const actions: string[] = [];
  for (const marker of AUDIT_CALL_MARKERS) {
    let from = 0;
    for (;;) {
      const start = source.indexOf(marker, from);
      if (start === -1) break;
      const open = start + marker.length - 1; // index of '('
      let depth = 0;
      let end = open;
      for (let i = open; i < source.length; i++) {
        const ch = source[i];
        if (ch === '(') depth++;
        else if (ch === ')') {
          depth--;
          if (depth === 0) {
            end = i;
            break;
          }
        }
      }
      const block = source.slice(open, end + 1);
      for (const match of block.matchAll(ACTION_RE)) actions.push(match[1]);
      from = end + 1;
    }
  }
  return actions;
}

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
      for (const action of extractAuditActions(source)) {
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
