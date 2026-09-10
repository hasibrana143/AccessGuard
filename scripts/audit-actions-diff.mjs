import fs from 'node:fs';

const src = fs.readFileSync('src/lib/audit.ts', 'utf8');
const m = src.match(/AUDIT_ACTIONS = \[([\s\S]*?)\] as const/);
const actions = [...m[1].matchAll(/'([^']+)'/g)].map((x) => x[1]);
const en = JSON.parse(fs.readFileSync('messages/en.json', 'utf8'));
const have = new Set(Object.keys(en.audit.actions));
const missing = actions.filter((a) => !have.has(a));
console.log('TOTAL_ACTIONS=' + actions.length);
console.log('MISSING_LABELS=' + missing.length);
for (const a of missing) console.log(a);
