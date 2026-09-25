import { describe, expect, it } from 'vitest';
import { InfusionPump, SecondaryKeypad } from '../src/index.js';

// SRS-235 v2 (effective) as written. The authenticated-session requirement
// (v3, RCM-07) is staged under CR-141 and isn't tested here yet.
describe('SRS-235 Session-bound keypad entry (v2)', () => {
  it('SRS-235: secondary keypad accepts a rate entry while the pump is powered on', () => {
    const pump = new InfusionPump();
    pump.powerOn();
    expect(new SecondaryKeypad(pump).enterRate(80)).toEqual({ accepted: true, rateMlPerH: 80 });
    expect(pump.rateMlPerH).toBe(80);
  });

  it('SRS-235: secondary keypad does not accept entries while the pump is powered off', () => {
    const pump = new InfusionPump();
    expect(new SecondaryKeypad(pump).enterRate(80)).toEqual({ accepted: false, reason: 'powered_off' });
    expect(pump.rateMlPerH).toBeUndefined();
  });
});
