// Infusion pump controller: brings the rate, bolus, air, occlusion and battery
// checks together, and applies the risk-control actions (stop the infusion,
// raise alarms) that the RCMs call for.

import { OCCLUSION_CAUSES, type Alarm, type DeviceEvent, type OcclusionCause } from './alarm.js';
import { AirInLineDetector } from './air.js';
import { checkBatteryReserve } from './battery.js';
import { validateBolusRequest, type BolusResult } from './bolus.js';
import { OcclusionDetector } from './occlusion.js';
import type { TherapyProfile } from './profile.js';
import { validateRateEntry, type RateEntryResult } from './rate.js';

export type PumpState = 'off' | 'idle' | 'infusing' | 'stopped';
export type EntrySource = 'primary_ui' | 'secondary_keypad';

export type PumpRateResult = RateEntryResult | { readonly accepted: false; readonly reason: 'powered_off' | 'no_clinician_session' };

/** SRS-235 (v3): a clinician session ends after this long without activity. */
export const CLINICIAN_SESSION_TIMEOUT_MS = 5 * 60_000;
export type AcknowledgeResult =
  | { readonly acknowledged: true }
  | { readonly acknowledged: false; readonly reason: 'no_active_alarm' | 'cause_required' };
export type PumpBolusResult = BolusResult | { readonly accepted: false; readonly reason: 'no_active_profile' | 'not_infusing' };

export class InfusionPump {
  #state: PumpState = 'off';
  #rateMlPerH: number | undefined;
  #profile: TherapyProfile | undefined;
  #alarms: Alarm[] = [];
  #eventLog: DeviceEvent[] = [];
  #session: { clinicianId: string; lastActivityMs: number } | undefined;
  #air = new AirInLineDetector();
  #occlusion = new OcclusionDetector();

  get state(): PumpState {
    return this.#state;
  }

  get rateMlPerH(): number | undefined {
    return this.#rateMlPerH;
  }

  get activeProfile(): TherapyProfile | undefined {
    return this.#profile;
  }

  get activeAlarms(): readonly Alarm[] {
    return this.#alarms;
  }

  /** The device event log: acknowledged occlusion alarms and their causes (SRS-237), refused keypad entries (SRS-235). */
  get eventLog(): readonly DeviceEvent[] {
    return this.#eventLog;
  }

  get poweredOn(): boolean {
    return this.#state !== 'off';
  }

  powerOn(): void {
    if (this.#state === 'off') this.#state = 'idle';
  }

  powerOff(): void {
    this.#state = 'off';
    this.#rateMlPerH = undefined;
    this.#session = undefined;
  }

  /** A clinician authenticated on the primary UI (SRS-235 v3). */
  signInClinician(clinicianId: string, nowMs: number): void {
    if (this.poweredOn) this.#session = { clinicianId, lastActivityMs: nowMs };
  }

  signOutClinician(): void {
    this.#session = undefined;
  }

  /** Whether an authenticated clinician session is active: signed in, and not timed out. */
  clinicianSessionActive(nowMs: number): boolean {
    return this.#session !== undefined && nowMs - this.#session.lastActivityMs < CLINICIAN_SESSION_TIMEOUT_MS;
  }

  /**
   * SRS-235 (v3), RCM-07 (RISK-31): the secondary keypad accepts a rate entry only while an
   * authenticated clinician session is active. An entry without one is rejected and logged.
   */
  enterRateFromSecondaryKeypad(rateMlPerH: number, nowMs: number): PumpRateResult {
    if (!this.poweredOn) return { accepted: false, reason: 'powered_off' };
    if (!this.clinicianSessionActive(nowMs)) {
      this.#session = undefined;
      this.#eventLog.push({ kind: 'entry_rejected', source: 'secondary_keypad', reason: 'no_clinician_session', rateMlPerH, atMs: nowMs });
      return { accepted: false, reason: 'no_clinician_session' };
    }
    this.#session = { ...this.#session!, lastActivityMs: nowMs };
    return this.enterRate(rateMlPerH, 'secondary_keypad');
  }

  selectProfile(profile: TherapyProfile): void {
    this.#profile = profile;
  }

  /** All rate entry paths share one validation (SRS-233). A rejected entry leaves the programmed rate unchanged. */
  enterRate(rateMlPerH: number, _source: EntrySource): PumpRateResult {
    if (!this.poweredOn) return { accepted: false, reason: 'powered_off' };
    const result = validateRateEntry(rateMlPerH);
    if (result.accepted) this.#rateMlPerH = result.rateMlPerH;
    return result;
  }

  start(): boolean {
    if (this.#state !== 'idle' && this.#state !== 'stopped') return false;
    if (this.#rateMlPerH === undefined) return false;
    if (this.#alarms.some((a) => a.priority === 'high')) return false;
    this.#state = 'infusing';
    return true;
  }

  requestBolus(volumeMl: number): PumpBolusResult {
    if (this.#state !== 'infusing') return { accepted: false, reason: 'not_infusing' };
    if (this.#profile === undefined) return { accepted: false, reason: 'no_active_profile' };
    return validateBolusRequest(volumeMl, this.#profile);
  }

  onAirDetected(volumeMl: number, nowMs: number): void {
    const alarm = this.#air.recordBubble(volumeMl, nowMs);
    if (alarm) {
      this.#stop();
      this.#raise(alarm);
    }
  }

  onDownstreamPressure(pressureMmHg: number, nowMs: number): void {
    const alarm = this.#occlusion.recordPressure(pressureMmHg, nowMs);
    if (alarm) this.#raise(alarm);
  }

  onBatteryStatus(remainingMah: number, nowMs: number): void {
    if (!this.poweredOn) return;
    const alarm = checkBatteryReserve(remainingMah, this.#rateMlPerH ?? 0, nowMs);
    if (alarm) this.#raise(alarm);
    else this.#alarms = this.#alarms.filter((a) => a.condition !== 'low_battery_reserve');
  }

  /**
   * SRS-237 (v1), RCM-11 (RISK-22): an occlusion alarm is silenced only once the clinician
   * selects the cause they checked, and the cause is recorded in the device event log.
   */
  acknowledgeOcclusionAlarm(cause: OcclusionCause | undefined, nowMs: number): AcknowledgeResult {
    if (!this.#alarms.some((a) => a.condition === 'downstream_occlusion')) return { acknowledged: false, reason: 'no_active_alarm' };
    if (cause === undefined || !OCCLUSION_CAUSES.includes(cause)) return { acknowledged: false, reason: 'cause_required' };
    this.#alarms = this.#alarms.filter((a) => a.condition !== 'downstream_occlusion');
    this.#eventLog.push({ kind: 'alarm_acknowledged', condition: 'downstream_occlusion', cause, atMs: nowMs });
    return { acknowledged: true };
  }

  /** Clinician has cleared and re-primed the line after an air-in-line alarm. */
  reprimeLine(): void {
    this.#air.reprime();
    this.#alarms = this.#alarms.filter((a) => a.condition !== 'air_in_line');
  }

  #stop(): void {
    if (this.#state === 'infusing') this.#state = 'stopped';
  }

  #raise(alarm: Alarm): void {
    if (!this.#alarms.some((a) => a.condition === alarm.condition)) this.#alarms.push(alarm);
  }
}
