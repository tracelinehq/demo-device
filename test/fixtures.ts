import type { TherapyProfile } from '../src/index.js';

// Fictional therapy profile used across tests.
export const heparinProfile: TherapyProfile = {
  id: 'TP-HEP-01',
  name: 'Heparin — adult standard',
  drug: 'heparin 25,000 units / 250 mL',
  maxRateMlPerH: 50,
  bolusCeilingMl: 5,
};
