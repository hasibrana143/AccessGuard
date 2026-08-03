import { describe, expect, it } from 'vitest';
import { validateTargetUrl, normalizeTargetUrl, isHostnameBlockedByName } from '@/lib/url-validation';

describe('isHostnameBlockedByName', () => {
  it('blocks localhost variants', () => {
    expect(isHostnameBlockedByName('localhost')).toBe(true);
    expect(isHostnameBlockedByName('localhost.localdomain')).toBe(true);
    expect(isHostnameBlockedByName('foo.local')).toBe(true);
    expect(isHostnameBlockedByName('bar.internal')).toBe(true);
  });
  it('allows normal hostnames', () => {
    expect(isHostnameBlockedByName('example.com')).toBe(false);
    expect(isHostnameBlockedByName('sub.example.co.uk')).toBe(false);
  });
});

describe('validateTargetUrl', () => {
  it('rejects non-http schemes', async () => {
    expect((await validateTargetUrl('file:///etc/passwd')).ok).toBe(false);
    expect((await validateTargetUrl('ftp://example.com')).ok).toBe(false);
    expect((await validateTargetUrl('javascript:alert(1)')).ok).toBe(false);
    expect((await validateTargetUrl('data:text/html,hi')).ok).toBe(false);
    expect((await validateTargetUrl('chrome://settings')).ok).toBe(false);
  });

  it('rejects malformed URLs', async () => {
    expect((await validateTargetUrl('not a url')).ok).toBe(false);
    expect((await validateTargetUrl('')).ok).toBe(false);
  });

  it('rejects URLs with embedded credentials', async () => {
    const r = await validateTargetUrl('https://admin:secret@example.com/');
    expect(r.ok).toBe(false);
    expect(r.error).toContain('credentials');
  });

  it('rejects private IPv4 literals', async () => {
    expect((await validateTargetUrl('http://127.0.0.1/')).ok).toBe(false);
    expect((await validateTargetUrl('http://10.0.0.5/admin')).ok).toBe(false);
    expect((await validateTargetUrl('http://192.168.1.1/')).ok).toBe(false);
    expect((await validateTargetUrl('http://172.16.0.1/')).ok).toBe(false);
    expect((await validateTargetUrl('http://169.254.169.254/latest/meta-data/')).ok).toBe(false);
    expect((await validateTargetUrl('http://0.0.0.0/')).ok).toBe(false);
  });

  it('rejects loopback IPv6 literals', async () => {
    expect((await validateTargetUrl('http://[::1]/')).ok).toBe(false);
    expect((await validateTargetUrl('http://[fc00::1]/')).ok).toBe(false);
    expect((await validateTargetUrl('http://[fe80::1]/')).ok).toBe(false);
  });

  it('rejects hostnames resolving to private IPs', async () => {
    expect((await validateTargetUrl('http://localhost:3000/')).ok).toBe(false);
    const r = await validateTargetUrl('http://localtest.me/');
    if (r.ok) {
      // localtest.me may not resolve in CI; if it resolves it must be blocked
      expect.fail('localtest.me resolved publicly — expected private/blocked');
    }
  });

  it('accepts public http/https URLs', async () => {
    const r = await validateTargetUrl('https://example.com/some/path?q=1');
    expect(r.ok).toBe(true);
    expect(r.url).toBe('https://example.com/some/path?q=1');
    expect((await validateTargetUrl('http://example.com/')).ok).toBe(true);
  });

  it('accepts public IPs', async () => {
    const r = await validateTargetUrl('http://1.1.1.1/');
    expect(r.ok).toBe(true);
    const r6 = await validateTargetUrl('http://[2606:4700:4700::1111]/');
    expect(r6.ok).toBe(true);
  });
});

describe('normalizeTargetUrl', () => {
  it('strips fragments and trims', () => {
    expect(normalizeTargetUrl('  https://Example.com/path#section  ')).toBe('https://example.com/path');
    expect(normalizeTargetUrl('https://example.com/')).toBe('https://example.com/');
  });
});
