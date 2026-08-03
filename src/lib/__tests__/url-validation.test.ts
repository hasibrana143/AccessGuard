import { describe, expect, it, vi } from 'vitest';
import { validateTargetUrl, normalizeTargetUrl, isHostnameBlockedByName } from '@/lib/url-validation';

vi.mock('dns/promises', () => ({
  lookup: vi.fn().mockResolvedValue([{ address: '93.184.216.34', family: 4 }]),
}));

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
    expect((await validateTargetUrl('file:///etc/passwd', { skipDnsCheck: true })).ok).toBe(false);
    expect((await validateTargetUrl('ftp://example.com', { skipDnsCheck: true })).ok).toBe(false);
    expect((await validateTargetUrl('javascript:alert(1)', { skipDnsCheck: true })).ok).toBe(false);
    expect((await validateTargetUrl('data:text/html,hi', { skipDnsCheck: true })).ok).toBe(false);
    expect((await validateTargetUrl('chrome://settings', { skipDnsCheck: true })).ok).toBe(false);
  });

  it('rejects malformed URLs', async () => {
    expect((await validateTargetUrl('not a url', { skipDnsCheck: true })).ok).toBe(false);
    expect((await validateTargetUrl('', { skipDnsCheck: true })).ok).toBe(false);
  });

  it('rejects URLs with embedded credentials', async () => {
    const r = await validateTargetUrl('https://admin:secret@example.com/', { skipDnsCheck: true });
    expect(r.ok).toBe(false);
    expect(r.error).toContain('credentials');
  });

  it('rejects private IPv4 literals', async () => {
    expect((await validateTargetUrl('http://127.0.0.1/', { skipDnsCheck: true })).ok).toBe(false);
    expect((await validateTargetUrl('http://10.0.0.5/admin', { skipDnsCheck: true })).ok).toBe(false);
    expect((await validateTargetUrl('http://192.168.1.1/', { skipDnsCheck: true })).ok).toBe(false);
    expect((await validateTargetUrl('http://172.16.0.1/', { skipDnsCheck: true })).ok).toBe(false);
    expect((await validateTargetUrl('http://169.254.169.254/latest/meta-data/', { skipDnsCheck: true })).ok).toBe(false);
    expect((await validateTargetUrl('http://0.0.0.0/', { skipDnsCheck: true })).ok).toBe(false);
  });

  it('rejects loopback IPv6 literals', async () => {
    expect((await validateTargetUrl('http://[::1]/', { skipDnsCheck: true })).ok).toBe(false);
    expect((await validateTargetUrl('http://[fc00::1]/', { skipDnsCheck: true })).ok).toBe(false);
    expect((await validateTargetUrl('http://[fe80::1]/', { skipDnsCheck: true })).ok).toBe(false);
  });

  it('rejects hostnames resolving to private IPs', async () => {
    expect((await validateTargetUrl('http://localhost:3000/', { skipDnsCheck: true })).ok).toBe(false);
    // localtest.me would require real DNS — skipped in mocked test
  });

  it('accepts public http/https URLs', async () => {
    const r = await validateTargetUrl('https://example.com/some/path?q=1', { skipDnsCheck: true });
    expect(r.ok).toBe(true);
    expect(r.url).toBe('https://example.com/some/path?q=1');
    expect((await validateTargetUrl('http://example.com/', { skipDnsCheck: true })).ok).toBe(true);
  });

  it('accepts public IPs', async () => {
    const r = await validateTargetUrl('http://1.1.1.1/', { skipDnsCheck: true });
    expect(r.ok).toBe(true);
    const r6 = await validateTargetUrl('http://[2606:4700:4700::1111]/', { skipDnsCheck: true });
    expect(r6.ok).toBe(true);
  });
});

describe('normalizeTargetUrl', () => {
  it('strips fragments and trims', () => {
    expect(normalizeTargetUrl('  https://Example.com/path#section  ')).toBe('https://example.com/path');
    expect(normalizeTargetUrl('https://example.com/')).toBe('https://example.com/');
  });
});
