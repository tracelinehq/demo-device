// SRS-235 (v2, effective): session-bound keypad entry.
//
// "The secondary keypad shall accept rate entries while the pump is powered on."
//
// This is the effective baseline as written. It isn't tied to a clinician
// session, which is the gap behind complaint C-231 and RISK-31. Requiring an
// authenticated session (SRS-235 v3, RCM-07) is staged under CR-141 and lands as
// its own change once approved.

import type { InfusionPump, PumpRateResult } from './pump.js';

export class SecondaryKeypad {
  readonly #pump: InfusionPump;

  constructor(pump: InfusionPump) {
    this.#pump = pump;
  }

  enterRate(rateMlPerH: number): PumpRateResult {
    return this.#pump.enterRate(rateMlPerH, 'secondary_keypad');
  }
}
