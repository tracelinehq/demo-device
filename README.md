# demo-device

Product code repository for the **fictional** Acme MedTech "Infusion Systems" infusion pump, used as the demo code repository for Traceline. Everything here (company, device, requirements, profiles, people) is made up. It isn't a real medical device and must not be used as one.

The QMS records (requirements, risks, change requests, signatures) live in Traceline and its records repository, not here. This repository holds the code and the CI that verifies it.

## What the module does

`src/` is a small firmware-style control module in strict TypeScript. It implements the **effective** requirement baseline seeded in Traceline:

| Module | Behaviour | Requirement |
|---|---|---|
| `rate.ts` | Rate entry validated against the 0.1–1200 mL/h device operating range, shared by every entry path | SRS-233 v7 |
| `bolus.ts` | Bolus requests rejected above the active therapy profile's ceiling | SRS-231 v6 |
| `air.ts` | Cumulative downstream air ≥ 0.5 mL raises a high-priority alarm | SRS-230 v5 |
| `occlusion.ts` | Pressure ≥ 620 mmHg held for 10 s raises a high-priority alarm (within the 15 s bound) | SRS-236 v4 |
| `battery.ts` | Reserve below 30 min at the current rate raises a medium-priority alarm | SRS-234 v3 |
| `profile.ts` | Imported therapy profiles are checked (SHA-256 digest, then schema) before they are committed | SRS-232 v2 |
| `keypad.ts` | Secondary keypad accepts rate entries while the pump is powered on | SRS-235 v2 |
| `pump.ts` | Controller that applies the risk-control actions (stop infusion, raise alarms) | RCM-01/03/04/05/06 |

### Pending changes (not implemented yet)

These are staged in Traceline but not approved. Each will arrive as its own PR once it is approved there, so CI evidence is tied to the new requirement version:

- **CR-142, SRS-233 v8:** limit the rate to the active therapy profile's configured maximum at entry (field complaint C-231). Until then, `TherapyProfile.maxRateMlPerH` is carried and schema-checked, but it isn't enforced at rate entry.
- **CR-141, SRS-235 v3:** the secondary keypad accepts rate entries only during an authenticated clinician session (RCM-07, RISK-31).

## Running tests locally

Requires Node 24.

```sh
npm ci
npm run typecheck
npm test           # human-readable output
npm run test:ci    # also writes reports/junit.xml
```

> **Local runs are a "local check" only.** They show you whether your change works. They are not verification evidence. Evidence comes only from the CI run against a pushed commit (Traceline doctrine 8).

## CI

`.github/workflows/ci.yml` runs on every pull request and on every push to `main`. It installs dependencies (`npm ci`), typechecks, runs the tests, and uploads `reports/junit.xml` as the artifact `junit-<commit sha>`. The upload runs even when tests fail.

## Test ↔ requirement / risk-control mapping

Each test belongs to exactly one key. The key is the file-name prefix (`test/<KEY>.<topic>.test.ts`), the start of the `describe` block, and the start of every test name (`<KEY>: …`). In the JUnit file, each testcase is named `<describe> > <KEY>: <test name>`, with `classname` set to the file path. So the key is the first token of the testcase name, and it can be matched with `^(SRS|RCM)-\d+`.

How CI results map to Traceline `test_case` records (TC-xx) is decided in D2. The TC column below only shows the verification record the seed data associates with each key.

| Key | Links (seed) | Test file | Test cases |
|---|---|---|---|
| SRS-230 | RISK-09, TC-84 | `test/SRS-230.air-in-line.test.ts` | no alarm below 0.5 mL cumulative air · high-priority alarm at exactly 0.5 mL · alarm on cumulative small bubbles reaching 0.5 mL · re-priming the line resets the cumulative total |
| SRS-231 | RISK-14, TC-88 | `test/SRS-231.bolus-ceiling.test.ts` | accepts a bolus equal to the profile ceiling · rejects a bolus above the profile ceiling · ceiling follows the active profile, not a fixed value · rejects zero, negative and non-numeric bolus requests |
| SRS-232 | RISK-31, RISK-40, TC-90 | `test/SRS-232.profile-integrity.test.ts` | a verified profile is committed to the configuration store · integrity is verified before commit — a failed check leaves the store untouched · a failed import does not replace an already committed profile · files that are not a profile envelope are rejected |
| SRS-233 | RISK-14, TC-88 | `test/SRS-233.rate-limiting.test.ts` | device maximum is 1200 mL/h · accepts 1200 mL/h (upper bound inclusive) · rejects 1200.1 mL/h as above device maximum · accepts entries across the operating range · rejects entries below the operating range and non-numeric entries |
| SRS-234 | RISK-17, TC-86 | `test/SRS-234.battery-reserve.test.ts` | medium-priority alarm when reserve falls below 30 minutes · no alarm at 30 minutes of reserve or more · reserve is computed at the current rate |
| SRS-235 | RISK-31 (no TC) | `test/SRS-235.keypad-entry.test.ts` | secondary keypad accepts a rate entry while the pump is powered on · secondary keypad does not accept entries while the pump is powered off |
| SRS-236 | RISK-12, TC-91 | `test/SRS-236.occlusion.test.ts` | high-priority alarm within 15 s at 620 mmHg · detection bound holds when occlusion begins mid-infusion · no alarm while pressure stays below 620 mmHg · alarm is raised once per occlusion episode |
| RCM-01 | RISK-09, SRS-230 | `test/RCM-01.air-stops-infusion.test.ts` | infusion stops with a high-priority alarm at 0.5 mL cumulative air · infusion cannot restart while the air-in-line alarm is active |
| RCM-03 ¹ | RISK-14, SRS-233 | `test/RCM-03.rate-limit-at-entry.test.ts` | out-of-range entry on the primary UI is rejected and the programmed rate is unchanged · out-of-range entry on the secondary keypad is rejected and the programmed rate is unchanged · out-of-range entry is rejected, never clamped to the maximum |
| RCM-04 | RISK-14, SRS-231 | `test/RCM-04.bolus-ceiling-enforced.test.ts` | pump rejects a bolus above the active profile ceiling · pump accepts a bolus within the active profile ceiling · pump rejects any bolus when no therapy profile is active |
| RCM-05 | RISK-12, SRS-236 | `test/RCM-05.occlusion-alarm.test.ts` | running pump raises a high-priority occlusion alarm within 15 s of 620 mmHg |
| RCM-06 | RISK-17, SRS-234 | `test/RCM-06.battery-alarm.test.ts` | pump annunciates before the battery runs out, then clears when charge recovers |
| RCM-08 | RISK-31, SRS-232 | `test/RCM-08.profile-tamper.test.ts` | a payload altered after export (raised bolus ceiling) is rejected · a single changed byte in the payload is detected |
| RCM-15 | RISK-40, SRS-232 | `test/RCM-15.profile-schema.test.ts` | rejects a profile with a missing field · rejects wrong types (numeric fields as strings) · rejects non-positive or non-finite limits · rejects a profile maximum rate above the device maximum · rejects unknown fields · rejects a payload that is not JSON even when its digest is valid |

¹ **RCM-03 is only partly covered.** Its title reads "limited to *configured* maximum at entry". Its implementing requirement, SRS-233 v7, only sets the 1200 mL/h device maximum. The tests verify that the limit is enforced at entry on both input paths. They don't verify a per-profile maximum, which comes with SRS-233 v8 (CR-142).

### Not covered

| Key | Reason |
|---|---|
| RCM-07 | Needs SRS-235 v3 (CR-141), which isn't approved yet. |
| RCM-11 | RISK-22 has no implementing requirement yet (`needs_requirement`). Implementing it would mean inventing one. |
| CRC-32 on profile import | Proposed in CR-145 (draft). SRS-232 is implemented with a SHA-256 digest instead. |
