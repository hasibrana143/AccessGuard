// Canonical, typed notification alert settings for organizations.
//
// Alert toggles live in Organization.settings JSON under the `alerts` key.
// Historically they were read ad-hoc (with mismatched keys between the UI and
// the worker), which caused scan emails to fire by default and made toggles
// silently ineffective. All reads/writes must go through these helpers.

export type AlertKey = 'criticalViolations' | 'scanCompleted';

export const ALERT_KEYS: readonly AlertKey[] = ['criticalViolations', 'scanCompleted'];

export const DEFAULT_ALERT_SETTINGS: Record<AlertKey, boolean> = {
  criticalViolations: true,
  scanCompleted: false,
};

export type AlertSettings = Record<AlertKey, boolean>;

// Coerce arbitrary input into a complete, valid AlertSettings object.
// Unknown keys are dropped; non-boolean values fall back to defaults.
export function normalizeAlertSettings(input: unknown): AlertSettings {
  const result: AlertSettings = { ...DEFAULT_ALERT_SETTINGS };
  if (input && typeof input === 'object' && !Array.isArray(input)) {
    const raw = input as Record<string, unknown>;
    for (const key of ALERT_KEYS) {
      if (typeof raw[key] === 'boolean') {
        result[key] = raw[key];
      }
    }
  }
  return result;
}

// Read alert settings from an org's raw settings JSON (never throws).
export function getAlertSettings(orgSettings: string | null | undefined): AlertSettings {
  if (!orgSettings) return { ...DEFAULT_ALERT_SETTINGS };
  try {
    const parsed = JSON.parse(orgSettings) as { alerts?: unknown };
    return normalizeAlertSettings(parsed?.alerts);
  } catch {
    return { ...DEFAULT_ALERT_SETTINGS };
  }
}

// Validate a settings PATCH payload for the `alerts` key.
// Returns the normalized settings, or null when the payload is malformed
// (unknown keys or non-boolean values are rejected, not silently merged).
export function validateAlertPatch(input: unknown): AlertSettings | null {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return null;
  const raw = input as Record<string, unknown>;
  const allowed = new Set<string>(ALERT_KEYS);
  for (const key of Object.keys(raw)) {
    if (!allowed.has(key) || typeof raw[key] !== 'boolean') {
      return null;
    }
  }
  return normalizeAlertSettings(raw);
}
