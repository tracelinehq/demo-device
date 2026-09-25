import { describe, expect, it } from 'vitest';
import { ConfigurationStore, encodeProfileEnvelope, importProfile, PROFILE_FORMAT, sha256Hex } from '../src/index.js';
import { heparinProfile } from './fixtures.js';

// RCM-15 (RISK-40): imported profiles validated against schema before commit.
// Envelopes here carry a correct digest, so only the schema check can stop them.
describe('RCM-15 Imported profiles validated against schema before commit', () => {
  const rejectsWithSchemaViolation = (profile: unknown) => {
    const store = new ConfigurationStore();
    expect(importProfile(encodeProfileEnvelope(profile), store)).toMatchObject({ committed: false, reason: 'schema_violation' });
    expect(store.size).toBe(0);
  };

  it('RCM-15: rejects a profile with a missing field', () => {
    const { bolusCeilingMl: _omitted, ...incomplete } = heparinProfile;
    rejectsWithSchemaViolation(incomplete);
  });

  it('RCM-15: rejects wrong types (numeric fields as strings)', () => {
    rejectsWithSchemaViolation({ ...heparinProfile, bolusCeilingMl: '5' });
  });

  it('RCM-15: rejects non-positive or non-finite limits', () => {
    rejectsWithSchemaViolation({ ...heparinProfile, bolusCeilingMl: 0 });
    rejectsWithSchemaViolation({ ...heparinProfile, maxRateMlPerH: -10 });
    rejectsWithSchemaViolation({ ...heparinProfile, maxRateMlPerH: null });
  });

  it('RCM-15: rejects a profile maximum rate above the device maximum', () => {
    rejectsWithSchemaViolation({ ...heparinProfile, maxRateMlPerH: 1500 });
  });

  it('RCM-15: rejects unknown fields', () => {
    rejectsWithSchemaViolation({ ...heparinProfile, overrideLimits: true });
  });

  it('RCM-15: rejects a payload that is not JSON even when its digest is valid', () => {
    const store = new ConfigurationStore();
    const payload = '{"id": "TP-HEP-01", ';
    const file = JSON.stringify({ format: PROFILE_FORMAT, payload, sha256: sha256Hex(payload) });
    expect(importProfile(file, store)).toMatchObject({ committed: false, reason: 'schema_violation' });
    expect(store.size).toBe(0);
  });
});
