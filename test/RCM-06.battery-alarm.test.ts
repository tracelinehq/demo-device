import { describe, expect, it } from 'vitest';
import { drawMilliamps, InfusionPump } from '../src/index.js';

// RCM-06 (RISK-17): medium-priority alarm below 30 minutes of battery reserve.
describe('RCM-06 Medium-priority alarm below 30 minutes of battery reserve', () => {
  it('RCM-06: pump annunciates before the battery runs out, then clears when charge recovers', () => {
    const pump = new InfusionPump();
    pump.powerOn();
    pump.enterRate(200, 'primary_ui');
    pump.start();
    const perMinute = drawMilliamps(200) / 60;

    pump.onBatteryStatus(perMinute * 45, 0);
    expect(pump.activeAlarms).toHaveLength(0);

    pump.onBatteryStatus(perMinute * 29, 60_000);
    expect(pump.activeAlarms).toContainEqual({ condition: 'low_battery_reserve', priority: 'medium', raisedAtMs: 60_000 });
    expect(pump.state).toBe('infusing');

    pump.onBatteryStatus(perMinute * 90, 120_000);
    expect(pump.activeAlarms).toHaveLength(0);
  });
});
