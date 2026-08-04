import { describe, it, expect } from 'vitest';
import {
  DEFAULT_ALERT_SETTINGS,
  ALERT_KEYS,
  normalizeAlertSettings,
  getAlertSettings,
  validateAlertPatch,
} from '@/lib/notification-settings';

describe('notification-settings', () => {
  it('exposes canonical keys with safe defaults (scanCompleted off, criticalViolations on)', () => {
    expect(ALERT_KEYS).toEqual(['criticalViolations', 'scanCompleted']);
    expect(DEFAULT_ALERT_SETTINGS).toEqual({ criticalViolations: true, scanCompleted: false });
  });

  it('normalizes arbitrary input to complete settings, dropping unknown keys', () => {
    expect(normalizeAlertSettings({ scanCompleted: true })).toEqual({
      criticalViolations: true,
      scanCompleted: true,
    });
    expect(normalizeAlertSettings({ scanComplete: true, bogus: 1 })).toEqual(DEFAULT_ALERT_SETTINGS);
  });

  it('falls back to defaults for non-boolean values', () => {
    expect(normalizeAlertSettings({ criticalViolations: 'yes' })).toEqual(DEFAULT_ALERT_SETTINGS);
    expect(normalizeAlertSettings(null)).toEqual(DEFAULT_ALERT_SETTINGS);
    expect(normalizeAlertSettings('nope')).toEqual(DEFAULT_ALERT_SETTINGS);
  });

  it('reads alerts from raw org settings JSON', () => {
    expect(getAlertSettings(JSON.stringify({ alerts: { criticalViolations: false, scanCompleted: true } })))
      .toEqual({ criticalViolations: false, scanCompleted: true });
    expect(getAlertSettings(null)).toEqual(DEFAULT_ALERT_SETTINGS);
    expect(getAlertSettings('{not json')).toEqual(DEFAULT_ALERT_SETTINGS);
    expect(getAlertSettings('{}')).toEqual(DEFAULT_ALERT_SETTINGS);
  });

  it('rejects malformed alert patches', () => {
    expect(validateAlertPatch({ criticalViolations: true, scanCompleted: true })).toEqual({
      criticalViolations: true,
      scanCompleted: true,
    });
    expect(validateAlertPatch({ scanCompleted: false })).toEqual({ criticalViolations: true, scanCompleted: false });
    expect(validateAlertPatch({ criticalViolations: 'yes' })).toBeNull();
    expect(validateAlertPatch({ scanComplete: true })).toBeNull();
    expect(validateAlertPatch('yes')).toBeNull();
    expect(validateAlertPatch([true])).toBeNull();
  });
});
