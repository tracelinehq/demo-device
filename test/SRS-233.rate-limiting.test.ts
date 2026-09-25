import { describe, expect, it } from 'vitest';
import { DEVICE_MAX_RATE_ML_PER_H, validateRateEntry } from '../src/index.js';

describe('SRS-233 Infusion rate limiting (v7)', () => {
  it('SRS-233: device maximum is 1200 mL/h', () => {
    expect(DEVICE_MAX_RATE_ML_PER_H).toBe(1200);
  });

  it('SRS-233: accepts 1200 mL/h (upper bound inclusive)', () => {
    expect(validateRateEntry(1200)).toEqual({ accepted: true, rateMlPerH: 1200 });
  });

  it('SRS-233: rejects 1200.1 mL/h as above device maximum', () => {
    expect(validateRateEntry(1200.1)).toEqual({ accepted: false, reason: 'above_device_maximum' });
  });

  it('SRS-233: accepts entries across the operating range', () => {
    for (const rate of [0.1, 1, 25, 125.5, 999, 1200]) {
      expect(validateRateEntry(rate)).toEqual({ accepted: true, rateMlPerH: rate });
    }
  });

  it('SRS-233: rejects entries below the operating range and non-numeric entries', () => {
    expect(validateRateEntry(0)).toEqual({ accepted: false, reason: 'below_device_minimum' });
    expect(validateRateEntry(-5)).toEqual({ accepted: false, reason: 'below_device_minimum' });
    expect(validateRateEntry(Number.NaN)).toEqual({ accepted: false, reason: 'not_a_number' });
    expect(validateRateEntry(Number.POSITIVE_INFINITY)).toEqual({ accepted: false, reason: 'not_a_number' });
  });
});
