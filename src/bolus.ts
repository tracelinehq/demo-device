// SRS-231 (v6, effective): bolus dose ceiling.
//
// "A single bolus shall not exceed the ceiling defined by the active therapy
// profile, and the pump shall reject any bolus request above that ceiling."

import type { TherapyProfile } from './profile.js';

export type BolusRejection = 'not_a_number' | 'not_positive' | 'above_profile_ceiling';

export type BolusResult =
  | { readonly accepted: true; readonly volumeMl: number }
  | { readonly accepted: false; readonly reason: BolusRejection };

export function validateBolusRequest(volumeMl: number, profile: TherapyProfile): BolusResult {
  if (!Number.isFinite(volumeMl)) return { accepted: false, reason: 'not_a_number' };
  if (volumeMl <= 0) return { accepted: false, reason: 'not_positive' };
  if (volumeMl > profile.bolusCeilingMl) return { accepted: false, reason: 'above_profile_ceiling' };
  return { accepted: true, volumeMl };
}
