import { describe, expect, it } from 'vitest';
import { OCCLUSION_DETECTION_BOUND_MS, OcclusionDetector } from '../src/index.js';

function feed(d: OcclusionDetector, pressureMmHg: number, fromMs: number, toMs: number, stepMs = 500) {
  for (let t = fromMs; t <= toMs; t += stepMs) {
    const alarm = d.recordPressure(pressureMmHg, t);
    if (alarm) return alarm;
  }
  return undefined;
}

describe('SRS-236 Downstream occlusion detection (v4)', () => {
  it('SRS-236: high-priority alarm within 15 s at 620 mmHg', () => {
    const alarm = feed(new OcclusionDetector(), 620, 0, OCCLUSION_DETECTION_BOUND_MS);
    expect(alarm?.condition).toBe('downstream_occlusion');
    expect(alarm?.priority).toBe('high');
    expect(alarm?.raisedAtMs).toBeLessThanOrEqual(OCCLUSION_DETECTION_BOUND_MS);
  });

  it('SRS-236: detection bound holds when occlusion begins mid-infusion', () => {
    const d = new OcclusionDetector();
    expect(feed(d, 300, 0, 60_000)).toBeUndefined();
    const alarm = feed(d, 640, 60_500, 60_500 + OCCLUSION_DETECTION_BOUND_MS);
    expect(alarm).toBeDefined();
    expect(alarm!.raisedAtMs - 60_500).toBeLessThanOrEqual(OCCLUSION_DETECTION_BOUND_MS);
  });

  it('SRS-236: no alarm while pressure stays below 620 mmHg', () => {
    expect(feed(new OcclusionDetector(), 619, 0, 120_000)).toBeUndefined();
  });

  it('SRS-236: alarm is raised once per occlusion episode', () => {
    const d = new OcclusionDetector();
    expect(feed(d, 700, 0, 15_000)).toBeDefined();
    expect(feed(d, 700, 15_500, 60_000)).toBeUndefined();
  });
});
