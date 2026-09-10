import { describe, it, expect } from 'vitest';
import en from '../../../messages/en.json';
import hi from '../../../messages/hi.json';

type Messages = Record<string, unknown>;

function leafPaths(obj: Messages, prefix = ''): string[] {
  const out: string[] = [];
  for (const [key, value] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      out.push(...leafPaths(value as Messages, path));
    } else {
      out.push(path);
    }
  }
  return out;
}

function rawKeys(obj: Messages): string[] {
  const out: string[] = [];
  for (const [key, value] of Object.entries(obj)) {
    out.push(key);
    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      out.push(...rawKeys(value as Messages));
    }
  }
  return out;
}

describe('i18n messages parity (en ↔ hi)', () => {
  const namespaces = new Set([...Object.keys(en), ...Object.keys(hi as Messages)]);

  it('has identical top-level namespaces', () => {
    expect(Object.keys(hi as Messages).sort()).toEqual(Object.keys(en).sort());
  });

  for (const ns of namespaces) {
    it(`namespace "${ns}" has identical deep key sets`, () => {
      const enLeaves = leafPaths(((en as Messages)[ns] ?? {}) as Messages).sort();
      const hiLeaves = leafPaths((((hi as Messages)[ns] ?? {}) as Messages)).sort();
      expect(hiLeaves).toEqual(enLeaves);
    });
  }

  it('contains no dotted keys (next-intl INVALID_KEY crash class)', () => {
    for (const [locale, dict] of [['en', en], ['hi', hi]] as const) {
      const dotted = rawKeys(dict as unknown as Messages).filter((k) => k.includes('.'));
      expect(dotted, `${locale} dotted keys`).toEqual([]);
    }
  });

  it('every leaf value is a string', () => {
    const check = (obj: Messages, where: string) => {
      for (const [key, value] of Object.entries(obj)) {
        if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
          check(value as Messages, `${where}.${key}`);
        } else {
          expect(typeof value, `${where}.${key}`).toBe('string');
        }
      }
    };
    check(en as unknown as Messages, 'en');
    check(hi as unknown as Messages, 'hi');
  });
});
