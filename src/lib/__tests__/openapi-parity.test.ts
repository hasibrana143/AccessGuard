import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { openApiSpec } from '@/lib/openapi';

// Every API route handler must have a documented path in the OpenAPI spec.
// Mount: servers[].url = "/api" so spec paths are API-relative.
function collectRouteFiles(dir: string): string[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectRouteFiles(full));
    } else if (entry.name === 'route.ts' || entry.name === 'route.tsx') {
      files.push(full);
    }
  }
  return files;
}

function routeToSpecPath(fullPath: string): string {
  // Cut everything up to the API root: src/app/api/<rel>/route.ts
  const marker = `${path.sep}api${path.sep}`;
  const idx = fullPath.indexOf(marker);
  if (idx === -1) return '';
  const stripped = fullPath
    .slice(idx + marker.length)
    .replace(/^\\?/, '')
    .replace(/route\.(ts|tsx)$/, '');
  const segments = stripped.split(/[\\/]/).filter(Boolean);
  const named = segments.map((s) => s.replace(/^\[\.\.\./, '{').replace(/^\[/, '{').replace(/\]$/, '}'));
  const p = `/${named.join('/')}`;
  return p === '/' ? '/' : p.replace(/\/+$/, '');
}

describe('OpenAPI spec parity (docs/runbooks/API_REFERENCE.md §6)', () => {
  const apiDir = path.resolve(__dirname, '../../app/api');
  const routeFiles = collectRouteFiles(apiDir);
  const specPaths = Object.keys(openApiSpec.paths) as string[];

  it('covers every route handler file', () => {
    const missing = routeFiles.filter((f) => {
      const specPath = routeToSpecPath(f);
      return !specPaths.includes(specPath);
    });
    expect(missing).toEqual([]);
  });

  it('documents at least 40 unique paths (regression floor, was 9)', () => {
    expect(specPaths.length).toBeGreaterThan(40);
  });

  it('has 37 schemas registered', () => {
    expect(Object.keys(openApiSpec.components.schemas).length).toBe(37);
  });
});
