import { z } from 'zod';
import { decryptSecret, encryptSecret, isEncrypted } from '@/lib/crypto';

/**
 * Scan authentication (cookies / headers / login script) shared by the API
 * routes and the scan executor.
 *
 * Rules:
 * - Every secret is encrypted at rest (AES-256-GCM via `@/lib/crypto`).
 * - The API never returns a secret: cookie values and sensitive headers are
 *   masked, the login script and the login credentials are omitted entirely.
 * - The scanner decrypts only at the moment it drives the browser.
 */

export const SCAN_AUTH_TYPES = ['cookie', 'header', 'script'] as const;

const cookieSchema = z.object({
  name: z.string().min(1),
  value: z.string(),
  domain: z.string().optional(),
  path: z.string().optional(),
});

export const scanAuthScriptConfigSchema = z.object({
  loginUrl: z.string().url().optional(),
  usernameSelector: z.string().optional(),
  passwordSelector: z.string().optional(),
  submitSelector: z.string().optional(),
  waitForSelector: z.string().optional(),
  waitAfterLogin: z.number().int().min(0).max(60_000).optional(),
  // Login credentials — encrypted at rest, never returned by the API.
  username: z.string().optional(),
  password: z.string().optional(),
});

export const scanAuthConfigSchema = z.object({
  cookies: z.array(cookieSchema).optional(),
  headers: z.record(z.string(), z.string()).optional(),
  script: z.string().max(20_000).optional(),
  scriptConfig: scanAuthScriptConfigSchema.optional(),
});

export type ScanAuthConfig = z.infer<typeof scanAuthConfigSchema>;
export type ScanAuthScriptConfig = z.infer<typeof scanAuthScriptConfigSchema>;

/** Shape handed to the scanner (same as the stored config, decrypted). */
export type AuthContext = ScanAuthConfig;

export const MASKED_SECRET = '••••••••';

const SENSITIVE_HEADER_HINTS = ['auth', 'token', 'cookie', 'secret', 'password', 'session'];

export function isSensitiveHeader(name: string): boolean {
  const lower = name.toLowerCase();
  return SENSITIVE_HEADER_HINTS.some((hint) => lower.includes(hint));
}

function encryptIfPresent(value: string | undefined): string | undefined {
  if (!value) return value;
  return isEncrypted(value) ? value : encryptSecret(value);
}

function decryptIfEncrypted(value: string | undefined): string | undefined {
  if (!value) return value;
  if (!isEncrypted(value)) return value;
  return decryptSecret(value) ?? value;
}

/** Encrypt every secret in the config. Returns the JSON string to store. */
export function encryptScanAuthConfig(config: ScanAuthConfig): string {
  const stored: ScanAuthConfig = {
    ...config,
    cookies: config.cookies?.map((c) => ({ ...c, value: encryptIfPresent(c.value) ?? c.value })),
    headers: config.headers
      ? Object.fromEntries(
          Object.entries(config.headers).map(([k, v]) => [
            k,
            isSensitiveHeader(k) ? encryptIfPresent(String(v)) ?? String(v) : String(v),
          ])
        )
      : undefined,
    script: encryptIfPresent(config.script),
    scriptConfig: config.scriptConfig
      ? {
          ...config.scriptConfig,
          username: encryptIfPresent(config.scriptConfig.username),
          password: encryptIfPresent(config.scriptConfig.password),
        }
      : undefined,
  };
  return JSON.stringify(stored);
}

/** Decrypt the stored config for the scanner. Returns null on malformed JSON. */
export function decryptScanAuthConfig(raw: string): ScanAuthConfig | null {
  let parsed: ScanAuthConfig;
  try {
    parsed = JSON.parse(raw) as ScanAuthConfig;
  } catch {
    return null;
  }
  return {
    ...parsed,
    cookies: parsed.cookies?.map((c) => ({ ...c, value: decryptIfEncrypted(c.value) ?? c.value })),
    headers: parsed.headers
      ? Object.fromEntries(
          Object.entries(parsed.headers).map(([k, v]) => [k, decryptIfEncrypted(String(v)) ?? String(v)])
        )
      : undefined,
    script: decryptIfEncrypted(parsed.script),
    scriptConfig: parsed.scriptConfig
      ? {
          ...parsed.scriptConfig,
          username: decryptIfEncrypted(parsed.scriptConfig.username),
          password: decryptIfEncrypted(parsed.scriptConfig.password),
        }
      : undefined,
  };
}

/** Response-safe view: secrets masked, script and credentials removed. */
export function maskScanAuthConfig(raw: string): ScanAuthConfig {
  let parsed: ScanAuthConfig;
  try {
    parsed = JSON.parse(raw) as ScanAuthConfig;
  } catch {
    return {};
  }
  const scriptConfig = parsed.scriptConfig
    ? {
        loginUrl: parsed.scriptConfig.loginUrl,
        usernameSelector: parsed.scriptConfig.usernameSelector,
        passwordSelector: parsed.scriptConfig.passwordSelector,
        submitSelector: parsed.scriptConfig.submitSelector,
        waitForSelector: parsed.scriptConfig.waitForSelector,
        waitAfterLogin: parsed.scriptConfig.waitAfterLogin,
      }
    : undefined;

  return {
    cookies: parsed.cookies?.map((c) => ({ ...c, value: c.value ? MASKED_SECRET : c.value })),
    headers: parsed.headers
      ? Object.fromEntries(
          Object.entries(parsed.headers).map(([k, v]) => [
            k,
            isSensitiveHeader(k) ? MASKED_SECRET : String(v),
          ])
        )
      : undefined,
    // The login script is executable code — it never leaves the server.
    script: undefined,
    scriptConfig,
  };
}
