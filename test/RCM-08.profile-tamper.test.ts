import { describe, expect, it } from 'vitest';
import { ConfigurationStore, encodeProfileEnvelope, importProfile } from '../src/index.js';
import { heparinProfile } from './fixtures.js';

// RCM-08 (RISK-31): therapy profile integrity verified before commit.
describe('RCM-08 Therapy profile integrity verified before commit', () => {
  it('RCM-08: a payload altered after signing (raised bolus ceiling) is rejected', () => {
    const store = new ConfigurationStore();
    const file = JSON.parse(encodeProfileEnvelope(heparinProfile)) as { payload: string };
    file.payload = file.payload.replace('"bolusCeilingMl":5', '"bolusCeilingMl":50');
    expect(importProfile(JSON.stringify(file), store)).toMatchObject({ committed: false, reason: 'integrity_mismatch' });
    expect(store.size).toBe(0);
  });

  it('RCM-08: a single changed byte in the payload is detected', () => {
    const store = new ConfigurationStore();
    const file = JSON.parse(encodeProfileEnvelope(heparinProfile)) as { payload: string };
    file.payload = file.payload.replace('adult', 'adulT');
    expect(importProfile(JSON.stringify(file), store)).toMatchObject({ committed: false, reason: 'integrity_mismatch' });
  });
});
