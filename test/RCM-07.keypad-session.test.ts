import { describe, expect, it } from 'vitest';
import { CLINICIAN_SESSION_TIMEOUT_MS, InfusionPump, SecondaryKeypad } from '../src/index.js';

// RCM-07 (RISK-31): rate-affecting entry requires an authenticated clinician session.
describe('RCM-07 Rate-affecting entry requires an authenticated clinician session', () => {
  function infusing(): InfusionPump {
    const pump = new InfusionPump();
    pump.powerOn();
    pump.signInClinician('clinician-1', 0);
    pump.enterRate(100, 'primary_ui');
    pump.start();
    return pump;
  }

  it('RCM-07: after the session times out, the keypad cannot change the running rate', () => {
    const pump = infusing();
    const keypad = new SecondaryKeypad(pump);
    expect(keypad.enterRate(40, CLINICIAN_SESSION_TIMEOUT_MS + 1).accepted).toBe(false);
    expect(pump.rateMlPerH).toBe(100);
    expect(pump.state).toBe('infusing');
  });

  it('RCM-07: after sign-out, the keypad cannot change the running rate', () => {
    const pump = infusing();
    pump.signOutClinician();
    expect(new SecondaryKeypad(pump).enterRate(40, 1_000).accepted).toBe(false);
    expect(pump.rateMlPerH).toBe(100);
  });

  it('RCM-07: keypad activity keeps the session alive, and a lapsed session stays closed', () => {
    const pump = infusing();
    const keypad = new SecondaryKeypad(pump);
    const step = CLINICIAN_SESSION_TIMEOUT_MS - 1_000;
    expect(keypad.enterRate(90, step).accepted).toBe(true);
    expect(keypad.enterRate(80, 2 * step).accepted).toBe(true);
    expect(keypad.enterRate(70, 3 * step + CLINICIAN_SESSION_TIMEOUT_MS).accepted).toBe(false);
    expect(keypad.enterRate(60, 3 * step + CLINICIAN_SESSION_TIMEOUT_MS + 1).accepted).toBe(false);
    expect(pump.rateMlPerH).toBe(80);
  });
});
