import { describe, expect, it } from 'vitest';
import { InfusionPump, SecondaryKeypad } from '../src/index.js';

// RCM-03 (RISK-14): infusion rate limited at entry. Implemented by SRS-233 v7,
// so the limit is the 1200 mL/h device maximum; the profile's configured
// maximum arrives with SRS-233 v8 (CR-142).
describe('RCM-03 Infusion rate limited at entry', () => {
  function runningPump(rate: number): InfusionPump {
    const pump = new InfusionPump();
    pump.powerOn();
    pump.enterRate(rate, 'primary_ui');
    pump.start();
    return pump;
  }

  it('RCM-03: out-of-range entry on the primary UI is rejected and the programmed rate is unchanged', () => {
    const pump = runningPump(100);
    expect(pump.enterRate(1500, 'primary_ui').accepted).toBe(false);
    expect(pump.rateMlPerH).toBe(100);
  });

  it('RCM-03: out-of-range entry on the secondary keypad is rejected and the programmed rate is unchanged', () => {
    const pump = runningPump(100);
    expect(new SecondaryKeypad(pump).enterRate(1500).accepted).toBe(false);
    expect(pump.rateMlPerH).toBe(100);
  });

  it('RCM-03: out-of-range entry is rejected, never clamped to the maximum', () => {
    const pump = runningPump(100);
    pump.enterRate(1201, 'primary_ui');
    expect(pump.rateMlPerH).not.toBe(1200);
  });
});
