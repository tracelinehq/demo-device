import { describe, expect, it } from 'vitest';
import { InfusionPump, type OcclusionCause } from '../src/index.js';

// SRS-237 v1 (CR-147): an occlusion alarm is silenced only with a selected cause, which is logged.
const occluded = () => {
  const pump = new InfusionPump();
  pump.powerOn();
  pump.enterRate(100, 'primary_ui');
  pump.start();
  for (let t = 0; t <= 10_000; t += 1000) pump.onDownstreamPressure(620, t);
  return pump;
};

describe('SRS-237 Occlusion alarm acknowledgement with cause (v1)', () => {
  it('SRS-237: an occlusion alarm is not silenced without a selected cause', () => {
    const pump = occluded();
    expect(pump.acknowledgeOcclusionAlarm(undefined, 11_000)).toEqual({ acknowledged: false, reason: 'cause_required' });
    expect(pump.activeAlarms.some((a) => a.condition === 'downstream_occlusion')).toBe(true);
    expect(pump.eventLog).toEqual([]);
  });

  it('SRS-237: a cause outside the offered list is refused', () => {
    const pump = occluded();
    expect(pump.acknowledgeOcclusionAlarm('ignored' as OcclusionCause, 11_000)).toEqual({ acknowledged: false, reason: 'cause_required' });
    expect(pump.activeAlarms.some((a) => a.condition === 'downstream_occlusion')).toBe(true);
  });

  it('SRS-237: the selected cause silences the alarm and is recorded in the device event log', () => {
    const pump = occluded();
    expect(pump.acknowledgeOcclusionAlarm('line_clamped', 11_000)).toEqual({ acknowledged: true });
    expect(pump.activeAlarms.some((a) => a.condition === 'downstream_occlusion')).toBe(false);
    expect(pump.eventLog).toEqual([{ kind: 'alarm_acknowledged', condition: 'downstream_occlusion', cause: 'line_clamped', atMs: 11_000 }]);
  });
});
