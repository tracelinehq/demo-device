// SRS-233 (v7, effective): infusion rate limiting.
//
// "The infusion rate shall not exceed 1200 mL/h. The pump shall accept rate
// entries within the device operating range."
//
// Every rate entry path (primary UI and secondary keypad) goes through
// validateRateEntry. The limit here is the fixed device maximum. Limiting to
// the active therapy profile's configured maximum is SRS-233 v8, staged under
// CR-142, and lands as its own change once approved.

/** Device operating range upper bound (SRS-233). */
export const DEVICE_MAX_RATE_ML_PER_H = 1200;

/** Device operating range lower bound (fictional design constant). */
export const DEVICE_MIN_RATE_ML_PER_H = 0.1;

export type RateRejection = 'not_a_number' | 'below_device_minimum' | 'above_device_maximum';

export type RateEntryResult =
  | { readonly accepted: true; readonly rateMlPerH: number }
  | { readonly accepted: false; readonly reason: RateRejection };

export function validateRateEntry(rateMlPerH: number): RateEntryResult {
  if (!Number.isFinite(rateMlPerH)) return { accepted: false, reason: 'not_a_number' };
  if (rateMlPerH < DEVICE_MIN_RATE_ML_PER_H) return { accepted: false, reason: 'below_device_minimum' };
  if (rateMlPerH > DEVICE_MAX_RATE_ML_PER_H) return { accepted: false, reason: 'above_device_maximum' };
  return { accepted: true, rateMlPerH };
}
