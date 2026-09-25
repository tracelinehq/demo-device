// SRS-236 (v4, effective): downstream occlusion detection.
//
// "The pump shall detect a downstream occlusion within 15 s at a line pressure
// of 620 mmHg and raise a high-priority alarm."
//
// Pressure must stay at or above the threshold for a confirmation window before
// the alarm is raised, so a transient spike (for example from patient movement)
// doesn't trigger it. The window is shorter than the 15 s bound in the
// requirement, leaving margin for the sensor sampling interval.

import type { Alarm } from './alarm.js';

export const OCCLUSION_PRESSURE_THRESHOLD_MMHG = 620;
export const OCCLUSION_DETECTION_BOUND_MS = 15_000;
export const OCCLUSION_CONFIRMATION_MS = 10_000;

export class OcclusionDetector {
  #aboveSinceMs: number | undefined;
  #alarmed = false;

  /** Feed one downstream pressure sample; returns the alarm the first time an occlusion is confirmed. */
  recordPressure(pressureMmHg: number, nowMs: number): Alarm | undefined {
    if (pressureMmHg < OCCLUSION_PRESSURE_THRESHOLD_MMHG) {
      this.#aboveSinceMs = undefined;
      this.#alarmed = false;
      return undefined;
    }
    this.#aboveSinceMs ??= nowMs;
    if (!this.#alarmed && nowMs - this.#aboveSinceMs >= OCCLUSION_CONFIRMATION_MS) {
      this.#alarmed = true;
      return { condition: 'downstream_occlusion', priority: 'high', raisedAtMs: nowMs };
    }
    return undefined;
  }
}
