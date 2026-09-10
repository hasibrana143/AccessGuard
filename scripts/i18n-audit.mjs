import fs from 'node:fs';
import path from 'node:path';

function walk(d, a = []) {
  for (const f of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, f.name);
    if (f.isDirectory()) {
      if (f.name === 'node_modules' || f.name === '.next') continue;
      walk(p, a);
    } else if (/\.(tsx?|jsx?)$/.test(f.name)) {
      a.push(p);
    }
  }
  return a;
}

const en = JSON.parse(fs.readFileSync('messages/en.json', 'utf8'));
const files = walk('src');
const nsRe = /useTranslations\(\s*['"]([^'"]+)['"]\s*\)/g;
// t('key') or t('key', {...}) — capture first string arg only
const tRe = /\bt\(\s*['"`]([^'"`}\\,]+)['"`]/g;
const used = {};

for (const f of files) {
  const s = fs.readFileSync(f, 'utf8');
  const namespaces = [];
  let m;
  nsRe.lastIndex = 0;
  while ((m = nsRe.exec(s))) namespaces.push(m[1]);
  const cur = namespaces[0] || null;
  tRe.lastIndex = 0;
  while ((m = tRe.exec(s))) {
    const k = m[1].trim();
    if (k.includes('${') || k.includes('+')) continue;
    if (!/^[a-zA-Z0-9_.]+$/.test(k)) continue;
    let full = k;
    if (!k.includes('.') && cur) full = cur + '.' + k;
    if (!k.includes('.') && !cur) continue;
    // Dotted keys used with a single-namespace t() (e.g. t('tabs.profile')
    // inside useTranslations('settings')) resolve under that namespace.
    if (k.includes('.') && cur && !k.startsWith(cur + '.')) {
      const first = k.split('.')[0];
      if (!(first in en)) full = cur + '.' + k;
    }
    used[full] = used[full] || [];
    if (!used[full].includes(f)) used[full].push(f);
  }
}

function has(o, p) {
  const parts = p.split('.');
  let c = o;
  for (const x of parts) {
    if (c && typeof c === 'object' && x in c) c = c[x];
    else return false;
  }
  return typeof c === 'string';
}
const missing = Object.keys(used).filter((k) => !has(en, k)).sort();
console.log('MISSING_COUNT=' + missing.length);
for (const k of missing) console.log(k + ' <= ' + used[k].join(','));
