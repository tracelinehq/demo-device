import { describe, expect, it } from 'vitest';
import { InfusionPump } from '../src/index.js';
import { heparinProfile } from './fixtures.js';

// RCM-04 (RISK-14): bolus dose ceiling enforced per therapy profile.
describe('RCM-04 Bolus dose ceiling enforced per therapy profile', () => {
  function infusingPump(): InfusionPump {
    const pump = new InfusionPump();
    pump.powerOn();
    pump.selectProfile(heparinProfile);
    pump.enterRate(10, 'primary_ui');
    pump.start();
    return pump;
  }

  it('RCM-04: pump rejects a bolus above the active profile ceiling', () => {
    expect(infusingPump().requestBolus(6)).toEqual({ accepted: false, reason: 'above_profile_ceiling' });
  });

  it('RCM-04: pump accepts a bolus within the active profile ceiling', () => {
    expect(infusingPump().requestBolus(4)).toEqual({ accepted: true, volumeMl: 4 });
  });

  it('RCM-04: pump rejects any bolus when no therapy profile is active', () => {
    const pump = new InfusionPump();
    pump.powerOn();
    pump.enterRate(10, 'primary_ui');
    pump.start();
    expect(pump.requestBolus(1)).toEqual({ accepted: false, reason: 'no_active_profile' });
  });
});
