import { describe, expect, it } from 'vitest';
import { InfusionPump } from '../src/index.js';

// RCM-11 (RISK-22): alarm acknowledgement requires cause selection before silencing.
describe('RCM-11 Alarm acknowledgement requires cause selection', () => {
  it('RCM-11: a running pump keeps its occlusion alarm until a cause is selected', () => {
    const pump = new InfusionPump();
    pump.powerOn();
    pump.enterRate(100, 'primary_ui');
    pump.start();
    for (let t = 0; t <= 15_000; t += 1000) pump.onDownstreamPressure(620, t);
    expect(pump.acknowledgeOcclusionAlarm(undefined, 15_500).acknowledged).toBe(false);
    expect(pump.activeAlarms.map((a) => a.condition)).toContain('downstream_occlusion');
    expect(pump.acknowledgeOcclusionAlarm('line_kinked', 16_000).acknowledged).toBe(true);
    expect(pump.activeAlarms.map((a) => a.condition)).not.toContain('downstream_occlusion');
    expect(pump.eventLog.map((e) => e.cause)).toEqual(['line_kinked']);
  });

  it('RCM-11: acknowledging with no occlusion alarm active changes nothing', () => {
    const pump = new InfusionPump();
    pump.powerOn();
    expect(pump.acknowledgeOcclusionAlarm('other', 1_000)).toEqual({ acknowledged: false, reason: 'no_active_alarm' });
    expect(pump.eventLog).toEqual([]);
  });
});
