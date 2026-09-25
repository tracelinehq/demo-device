import { describe, expect, it } from 'vitest';
import { validateBolusRequest } from '../src/index.js';
import { heparinProfile } from './fixtures.js';

describe('SRS-231 Bolus dose ceiling (v6)', () => {
  it('SRS-231: accepts a bolus equal to the profile ceiling', () => {
    expect(validateBolusRequest(5, heparinProfile)).toEqual({ accepted: true, volumeMl: 5 });
  });

  it('SRS-231: rejects a bolus above the profile ceiling', () => {
    expect(validateBolusRequest(5.01, heparinProfile)).toEqual({ accepted: false, reason: 'above_profile_ceiling' });
  });

  it('SRS-231: ceiling follows the active profile, not a fixed value', () => {
    const tighter = { ...heparinProfile, id: 'TP-HEP-02', bolusCeilingMl: 2 };
    expect(validateBolusRequest(3, heparinProfile).accepted).toBe(true);
    expect(validateBolusRequest(3, tighter)).toEqual({ accepted: false, reason: 'above_profile_ceiling' });
  });

  it('SRS-231: rejects zero, negative and non-numeric bolus requests', () => {
    expect(validateBolusRequest(0, heparinProfile).accepted).toBe(false);
    expect(validateBolusRequest(-1, heparinProfile).accepted).toBe(false);
    expect(validateBolusRequest(Number.NaN, heparinProfile).accepted).toBe(false);
  });
});
