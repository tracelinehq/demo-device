import { describe, expect, it } from 'vitest';
import { checkBatteryReserve, drawMilliamps, reserveMinutes } from '../src/index.js';

// Remaining charge (mAh) that gives exactly `minutes` of reserve at `rate`.
const chargeFor = (minutes: number, rate: number) => (minutes / 60) * drawMilliamps(rate);

describe('SRS-234 Battery reserve annunciation (v3)', () => {
  it('SRS-234: medium-priority alarm when reserve falls below 30 minutes', () => {
    expect(checkBatteryReserve(chargeFor(29.9, 100), 100, 7)).toEqual({ condition: 'low_battery_reserve', priority: 'medium', raisedAtMs: 7 });
  });

  it('SRS-234: no alarm at 30 minutes of reserve or more', () => {
    expect(checkBatteryReserve(chargeFor(30, 100), 100, 0)).toBeUndefined();
    expect(checkBatteryReserve(chargeFor(240, 100), 100, 0)).toBeUndefined();
  });

  it('SRS-234: reserve is computed at the current rate', () => {
    const charge = chargeFor(31, 25);
    expect(reserveMinutes(charge, 25)).toBeCloseTo(31);
    expect(checkBatteryReserve(charge, 25, 0)).toBeUndefined();
    expect(checkBatteryReserve(charge, 1200, 0)?.priority).toBe('medium');
  });
});
