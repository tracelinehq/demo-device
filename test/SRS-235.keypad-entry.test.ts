import { describe, expect, it } from 'vitest';
import { CLINICIAN_SESSION_TIMEOUT_MS, InfusionPump, SecondaryKeypad } from '../src/index.js';

// SRS-235 v3 (CR-141): the secondary keypad accepts rate entries only during an
// authenticated clinician session; entries without one are rejected and logged.
describe('SRS-235 Session-bound keypad entry (v3)', () => {
  it('SRS-235: secondary keypad accepts a rate entry during an authenticated clinician session', () => {
    const pump = new InfusionPump();
    pump.powerOn();
    pump.signInClinician('clinician-1', 0);
    expect(new SecondaryKeypad(pump).enterRate(80, 1_000)).toEqual({ accepted: true, rateMlPerH: 80 });
    expect(pump.rateMlPerH).toBe(80);
  });

  it('SRS-235: an entry with no clinician signed in is rejected and logged', () => {
    const pump = new InfusionPump();
    pump.powerOn();
    expect(new SecondaryKeypad(pump).enterRate(80, 1_000)).toEqual({ accepted: false, reason: 'no_clinician_session' });
    expect(pump.rateMlPerH).toBeUndefined();
    expect(pump.eventLog).toEqual([{ kind: 'entry_rejected', source: 'secondary_keypad', reason: 'no_clinician_session', rateMlPerH: 80, atMs: 1_000 }]);
  });

  it('SRS-235: an entry after the clinician session timed out is rejected and logged', () => {
    const pump = new InfusionPump();
    pump.powerOn();
    pump.signInClinician('clinician-1', 0);
    expect(new SecondaryKeypad(pump).enterRate(80, CLINICIAN_SESSION_TIMEOUT_MS)).toEqual({ accepted: false, reason: 'no_clinician_session' });
    expect(pump.eventLog.map((e) => e.kind)).toEqual(['entry_rejected']);
  });

  it('SRS-235: secondary keypad does not accept entries while the pump is powered off', () => {
    const pump = new InfusionPump();
    pump.signInClinician('clinician-1', 0);
    expect(new SecondaryKeypad(pump).enterRate(80, 1_000)).toEqual({ accepted: false, reason: 'powered_off' });
    expect(pump.rateMlPerH).toBeUndefined();
  });
});
