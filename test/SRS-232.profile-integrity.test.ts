import { describe, expect, it } from 'vitest';
import { ConfigurationStore, encodeProfileEnvelope, importProfile } from '../src/index.js';
import { heparinProfile } from './fixtures.js';

describe('SRS-232 Therapy profile integrity (v2)', () => {
  it('SRS-232: a verified profile is committed to the configuration store', () => {
    const store = new ConfigurationStore();
    const result = importProfile(encodeProfileEnvelope(heparinProfile), store);
    expect(result).toEqual({ committed: true, profile: heparinProfile });
    expect(store.get(heparinProfile.id)).toEqual(heparinProfile);
  });

  it('SRS-232: integrity is verified before commit — a failed check leaves the store untouched', () => {
    const store = new ConfigurationStore();
    const file = JSON.parse(encodeProfileEnvelope(heparinProfile)) as { sha256: string };
    file.sha256 = '0'.repeat(64);
    expect(importProfile(JSON.stringify(file), store).committed).toBe(false);
    expect(store.size).toBe(0);
  });

  it('SRS-232: a failed import does not replace an already committed profile', () => {
    const store = new ConfigurationStore();
    importProfile(encodeProfileEnvelope(heparinProfile), store);
    const file = JSON.parse(encodeProfileEnvelope({ ...heparinProfile, bolusCeilingMl: 50 })) as { payload: string; sha256: string };
    file.sha256 = '0'.repeat(64);
    importProfile(JSON.stringify(file), store);
    expect(store.get(heparinProfile.id)?.bolusCeilingMl).toBe(5);
  });

  it('SRS-232: files that are not a profile envelope are rejected', () => {
    const store = new ConfigurationStore();
    expect(importProfile('not json', store)).toMatchObject({ committed: false, reason: 'malformed_envelope' });
    expect(importProfile(JSON.stringify(heparinProfile), store)).toMatchObject({ committed: false, reason: 'malformed_envelope' });
    expect(store.size).toBe(0);
  });
});
