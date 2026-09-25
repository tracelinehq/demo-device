import { describe, expect, it } from 'vitest';
import { InfusionPump } from '../src/index.js';

// RCM-01 (RISK-09): infusion stopped and high-priority alarm on >= 0.5 mL cumulative air.
describe('RCM-01 Infusion stopped and high-priority alarm on air in line', () => {
  function infusingPump(): InfusionPump {
    const pump = new InfusionPump();
    pump.powerOn();
    pump.enterRate(100, 'primary_ui');
    pump.start();
    return pump;
  }

  it('RCM-01: infusion stops with a high-priority alarm at 0.5 mL cumulative air', () => {
    const pump = infusingPump();
    pump.onAirDetected(0.25, 1000);
    expect(pump.state).toBe('infusing');
    pump.onAirDetected(0.25, 2000);
    expect(pump.state).toBe('stopped');
    expect(pump.activeAlarms).toContainEqual({ condition: 'air_in_line', priority: 'high', raisedAtMs: 2000 });
  });

  it('RCM-01: infusion cannot restart while the air-in-line alarm is active', () => {
    const pump = infusingPump();
    pump.onAirDetected(0.6, 1000);
    expect(pump.start()).toBe(false);
    pump.reprimeLine();
    expect(pump.start()).toBe(true);
  });
});
