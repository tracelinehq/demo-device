import { describe, expect, it } from 'vitest';
import { AirInLineDetector } from '../src/index.js';

describe('SRS-230 Air-in-line detection (v5)', () => {
  it('SRS-230: no alarm below 0.5 mL cumulative air', () => {
    const d = new AirInLineDetector();
    expect(d.recordBubble(0.3, 0)).toBeUndefined();
    expect(d.recordBubble(0.19, 1000)).toBeUndefined();
    expect(d.cumulativeMl).toBeCloseTo(0.49);
  });

  it('SRS-230: high-priority alarm at exactly 0.5 mL', () => {
    expect(new AirInLineDetector().recordBubble(0.5, 42)).toEqual({ condition: 'air_in_line', priority: 'high', raisedAtMs: 42 });
  });

  it('SRS-230: alarm on cumulative small bubbles reaching 0.5 mL', () => {
    const d = new AirInLineDetector();
    const alarms = [0.1, 0.2, 0.2].map((v, i) => d.recordBubble(v, i * 1000));
    expect(alarms.slice(0, 2)).toEqual([undefined, undefined]);
    expect(alarms[2]?.priority).toBe('high');
  });

  it('SRS-230: re-priming the line resets the cumulative total', () => {
    const d = new AirInLineDetector();
    d.recordBubble(0.4, 0);
    d.reprime();
    expect(d.recordBubble(0.4, 1000)).toBeUndefined();
  });
});
