import { lookup } from 'dns/promises';

export interface UrlValidationResult {
  ok: boolean;
  url?: string;
  error?: string;
}

export interface ValidateTargetUrlOptions {
  /** Skip DNS resolution — for testing only */
  skipDnsCheck?: boolean;
}

const ALLOWED_SCHEMES = new Set(['http:', 'https:']);

// IPv4 ranges that must never be scanned server-side
const PRIVATE_V4_RANGES: Array<{ name: string; start: number; end: number }> = [
  { name: 'unspecified', start: 0x00000000, end: 0x000000ff }, // 0.0.0.0/8
  { name: 'ietf-reserved', start: 0xc0000000, end: 0xc00000ff }, // 192.0.0.0/24
  { name: 'test-net-1', start: 0xc0000200, end: 0xc00002ff }, // 192.0.2.0/24
  { name: 'loopback', start: 0x7f000000, end: 0x7fffffff }, // 127.0.0.0/8
  { name: 'private-10', start: 0x0a000000, end: 0x0affffff }, // 10.0.0.0/8
  { name: 'private-172', start: 0xac100000, end: 0xac1fffff }, // 172.16.0.0/12
  { name: 'private-192', start: 0xc0a80000, end: 0xc0a8ffff }, // 192.168.0.0/16
  { name: 'carrier-nat', start: 0x64400000, end: 0x647fffff }, // 100.64.0.0/10
  { name: 'link-local', start: 0xa9fe0000, end: 0xa9feffff }, // 169.254.0.0/16
  { name: 'benchmark', start: 0xc6120000, end: 0xc613ffff }, // 198.18.0.0/15
  { name: 'test-net-2', start: 0xc6336400, end: 0xc63364ff }, // 198.51.100.0/24
  { name: 'test-net-3', start: 0xcb007100, end: 0xcb0071ff }, // 203.0.113.0/24
  { name: 'multicast', start: 0xe0000000, end: 0xefffffff }, // 224.0.0.0/4
  { name: 'reserved', start: 0xf0000000, end: 0xffffffff }, // 240.0.0.0/4
];

// IPv6 ranges that must never be scanned server-side (128-bit BigInt masks)
const PRIVATE_V6_RANGES: Array<{ name: string; start: bigint; end: bigint }> = [
  { name: 'unspecified', start: 0n, end: 0n }, // ::
  { name: 'loopback', start: 0x1n, end: 0x1n }, // ::1
  { name: 'ipv4-mapped', start: 0xffffn << 80n, end: (0xffffn << 80n) + 0xffffffffn }, // ::ffff:0:0/96
  { name: 'link-local', start: 0xfe80n << 112n, end: (0xfebfn << 112n) + ((1n << 112n) - 1n) }, // fe80::/10
  { name: 'unique-local', start: 0xfcn << 120n, end: (0xfdn << 120n) + ((1n << 120n) - 1n) }, // fc00::/7
  { name: 'multicast', start: 0xffn << 120n, end: (0xffn << 120n) + ((1n << 120n) - 1n) }, // ff00::/8
  { name: 'doc', start: 0x20010db8n << 96n, end: (0x20010db8n << 96n) + ((1n << 32n) - 1n) }, // 2001:db8::/32
];

function ipv4ToInt(ip: string): number | null {
  const parts = ip.split('.');
  if (parts.length !== 4) return null;
  let value = 0;
  for (const part of parts) {
    if (!/^\d{1,3}$/.test(part)) return null;
    const n = parseInt(part, 10);
    if (n > 255) return null;
    value = (value << 8) | n;
  }
  return value >>> 0;
}

function ipv6ToBigInt(ip: string): bigint | null {
  let input = ip;
  const v4match = input.match(/^(.*):(\d+\.\d+\.\d+\.\d+)$/);
  if (v4match) {
    const v4 = ipv4ToInt(v4match[2]);
    if (v4 === null) return null;
    input = `${v4match[1]}:${((v4 >>> 16) & 0xffff).toString(16)}:${(v4 & 0xffff).toString(16)}`;
  }

  const hasDoubleColon = input.includes('::');
  const groups = input.split('::');
  if (groups.length > 2) return null;

  const parseGroup = (part: string): bigint[] | null => {
    if (!part) return [];
    const out: bigint[] = [];
    for (const g of part.split(':')) {
      if (!/^[0-9a-fA-F]{1,4}$/.test(g)) return null;
      out.push(BigInt(`0x${g}`));
    }
    return out;
  };

  let left: bigint[] | null;
  let right: bigint[] = [];
  if (hasDoubleColon) {
    left = parseGroup(groups[0]);
    if (groups[1]) {
      const parsed = parseGroup(groups[1]);
      if (parsed === null) return null;
      right = parsed;
    }
    if (left === null) return null;
    if (left.length + right.length > 7) return null;
  } else {
    left = parseGroup(groups[0]);
    if (left === null || left.length !== 8) return null;
  }

  const parts = [...left, ...Array(8 - left.length - right.length).fill(0n), ...right];
  let value = 0n;
  for (const p of parts) value = (value << 16n) | (p & 0xffffn);
  return value;
}

function isPrivateIpv4(ip: string): string | null {
  const value = ipv4ToInt(ip);
  if (value === null) return null;
  for (const range of PRIVATE_V4_RANGES) {
    if (value >= range.start && value <= range.end) return range.name;
  }
  return null;
}

function isPrivateIpv6(ip: string): string | null {
  const value = ipv6ToBigInt(ip);
  if (value === null) return null;
  for (const range of PRIVATE_V6_RANGES) {
    if (value >= range.start && value <= range.end) return range.name;
  }
  return null;
}

function isPrivateIp(ip: string): string | null {
  const v4 = isPrivateIpv4(ip);
  if (v4 !== null) return v4;
  const v6 = isPrivateIpv6(ip);
  if (v6 !== null) return v6;
  return null;
}

const BLOCKED_HOSTNAMES = ['localhost', 'localhost.localdomain'];

export function isHostnameBlockedByName(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/\.$/, '');
  if (BLOCKED_HOSTNAMES.includes(host)) return true;
  if (host.endsWith('.local') || host.endsWith('.internal')) return true;
  return false;
}

/**
 * Validate a user-supplied scan target. Blocks non-http(s) schemes, URL
 * credentials, private/link-local/loopback/metadata IPs and rebinding-prone
 * hostnames. Performs a DNS lookup of all resolved addresses.
 */
export async function validateTargetUrl(
  rawUrl: string,
  options: ValidateTargetUrlOptions = {}
): Promise<UrlValidationResult> {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl.trim());
  } catch {
    return { ok: false, error: 'Invalid URL' };
  }

  if (!ALLOWED_SCHEMES.has(parsed.protocol)) {
    return { ok: false, error: 'Only http:// and https:// URLs are allowed' };
  }
  if (!parsed.hostname) {
    return { ok: false, error: 'URL must include a hostname' };
  }
  if (parsed.username || parsed.password) {
    return { ok: false, error: 'URLs with embedded credentials are not allowed' };
  }

  const hostname = parsed.hostname.toLowerCase().replace(/^\[|\]$/g, '');
  if (isHostnameBlockedByName(hostname)) {
    return { ok: false, error: `Hostname "${hostname}" is not allowed` };
  }

  // IPv4/IPv6 literal in the URL
  const literalKind = hostname.includes(':') ? 6 : hostname.split('.').length === 4 && /^\d+\.\d+\.\d+\.\d+$/.test(hostname) ? 4 : 0;
  if (literalKind === 4 || literalKind === 6) {
    const blocked = isPrivateIp(literalKind === 4 ? hostname : hostname);
    if (blocked !== null) {
      return { ok: false, error: `Target resolves to a blocked address (${blocked})` };
    }
    return { ok: true, url: parsed.href };
  }

  // DNS resolution + private IP check (also blocks DNS rebinding tricks at lookup time)
  if (!options.skipDnsCheck) {
    let addresses: Array<{ address: string; family: number }>;
    try {
      addresses = await lookup(hostname, { all: true, verbatim: true });
    } catch {
      return { ok: false, error: 'Could not resolve hostname' };
    }

    if (addresses.length === 0) {
      return { ok: false, error: 'Could not resolve hostname' };
    }

    for (const { address } of addresses) {
      const blocked = isPrivateIp(address);
      if (blocked !== null) {
        return { ok: false, error: `Target resolves to a blocked address (${blocked})` };
      }
    }
  }

  return { ok: true, url: parsed.href };
}

/** Normalize a user-supplied URL for storage (scheme lowercase, no fragment). */
export function normalizeTargetUrl(rawUrl: string): string {
  try {
    const parsed = new URL(rawUrl.trim());
    parsed.hash = '';
    return parsed.href;
  } catch {
    return rawUrl.trim();
  }
}
