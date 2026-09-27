// SRS-235 (v3, CR-141): session-bound keypad entry.
//
// "The secondary keypad shall accept rate entries only while an authenticated
// clinician session is active. Entries made without an active session shall be
// rejected and logged."
//
// Implements RCM-07 (RISK-31). The session check lives in the pump
// (enterRateFromSecondaryKeypad), so no keypad path can reach enterRate around it.

import type { InfusionPump, PumpRateResult } from './pump.js';

export class SecondaryKeypad {
  readonly #pump: InfusionPump;

  constructor(pump: InfusionPump) {
    this.#pump = pump;
  }

  enterRate(rateMlPerH: number, nowMs: number): PumpRateResult {
    return this.#pump.enterRateFromSecondaryKeypad(rateMlPerH, nowMs);
  }
}
