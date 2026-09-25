import { describe, expect, it } from 'vitest';
import { InfusionPump } from '../src/index.js';

// RCM-05 (RISK-12): occlusion detected within 15 s at 620 mmHg with high-priority alarm.
describe('RCM-05 Occlusion detected within 15 s with high-priority alarm', () => {
  it('RCM-05: running pump raises a high-priority occlusion alarm within 15 s of 620 mmHg', () => {
    const pump = new InfusionPump();
    pump.powerOn();
    pump.enterRate(100, 'primary_ui');
    pump.start();
    for (let t = 0; t <= 15_000; t += 1000) pump.onDownstreamPressure(620, t);
    const alarm = pump.activeAlarms.find((a) => a.condition === 'downstream_occlusion');
    expect(alarm?.priority).toBe('high');
    expect(alarm?.raisedAtMs).toBeLessThanOrEqual(15_000);
  });
});
