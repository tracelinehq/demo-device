// SRS-230 (v5, effective): air-in-line detection.
//
// "The pump shall stop the infusion and raise a high-priority alarm when a
// cumulative air bolus of 0.5 mL or more is detected in the downstream line."
//
// The ultrasonic sensor reports each detected bubble's volume. Volumes are
// accumulated in whole microlitres so that summing small bubbles doesn't pick
// up floating-point error at the threshold. The total resets only when the line
// is re-primed.

import type { Alarm } from './alarm.js';

export const AIR_ALARM_THRESHOLD_UL = 500; // 0.5 mL

export class AirInLineDetector {
  #cumulativeUl = 0;

  get cumulativeMl(): number {
    return this.#cumulativeUl / 1000;
  }

  /** Returns a high-priority alarm once cumulative air reaches the threshold. */
  recordBubble(volumeMl: number, nowMs: number): Alarm | undefined {
    if (!Number.isFinite(volumeMl) || volumeMl <= 0) return undefined;
    this.#cumulativeUl += Math.round(volumeMl * 1000);
    if (this.#cumulativeUl >= AIR_ALARM_THRESHOLD_UL) {
      return { condition: 'air_in_line', priority: 'high', raisedAtMs: nowMs };
    }
    return undefined;
  }

  /** Called after the clinician clears and re-primes the line. */
  reprime(): void {
    this.#cumulativeUl = 0;
  }
}
