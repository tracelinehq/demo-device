// SRS-234 (v3, effective): battery reserve annunciation.
//
// "The pump shall annunciate a medium-priority alarm when the remaining battery
// reserve falls below 30 minutes of infusion at the current rate."
//
// Reserve is estimated from the remaining charge and the pump's current draw,
// which depends on the delivery rate. The draw model constants are fictional.

import type { Alarm } from './alarm.js';

export const LOW_RESERVE_THRESHOLD_MIN = 30;

/** Electronics, display and sensors (fictional). */
export const BASE_DRAW_MA = 120;
/** Additional motor draw per mL/h of delivery (fictional). */
export const MOTOR_DRAW_MA_PER_ML_PER_H = 0.5;

export function drawMilliamps(rateMlPerH: number): number {
  return BASE_DRAW_MA + MOTOR_DRAW_MA_PER_ML_PER_H * rateMlPerH;
}

export function reserveMinutes(remainingMah: number, rateMlPerH: number): number {
  return (Math.max(0, remainingMah) / drawMilliamps(rateMlPerH)) * 60;
}

export function checkBatteryReserve(remainingMah: number, rateMlPerH: number, nowMs: number): Alarm | undefined {
  if (reserveMinutes(remainingMah, rateMlPerH) < LOW_RESERVE_THRESHOLD_MIN) {
    return { condition: 'low_battery_reserve', priority: 'medium', raisedAtMs: nowMs };
  }
  return undefined;
}
