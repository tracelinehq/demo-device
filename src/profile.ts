// SRS-232 (v2, effective): therapy profile integrity.
//
// "The pump shall verify the integrity of an imported therapy profile before it
// is committed to the configuration store."
//
// An imported profile file is an envelope carrying the profile payload and its
// SHA-256 digest. Import runs in this order, and nothing reaches the store
// unless every step passes:
//   1. envelope is well-formed,
//   2. digest matches the payload bytes (integrity; RCM-08),
//   3. payload satisfies the profile schema (RCM-15; the formulary export is SOUP).
//
// CR-145 (draft): an envelope may also carry a CRC-32 of the payload, written by
// pharmacy tooling that predates SHA-256. When present it must match; a mismatch
// is rejected as an integrity failure before the digest is even consulted.

import { createHash } from 'node:crypto';
import { DEVICE_MAX_RATE_ML_PER_H } from './rate.js';

export const PROFILE_FORMAT = 'acme-therapy-profile/1';

export interface TherapyProfile {
  readonly id: string;
  readonly name: string;
  readonly drug: string;
  /** Configured maximum rate for this therapy. Not enforced at rate entry until SRS-233 v8 (CR-142). */
  readonly maxRateMlPerH: number;
  /** Ceiling for a single bolus (SRS-231). */
  readonly bolusCeilingMl: number;
}

export type ImportRejection = 'malformed_envelope' | 'integrity_mismatch' | 'schema_violation';

export type ImportResult =
  | { readonly committed: true; readonly profile: TherapyProfile }
  | { readonly committed: false; readonly reason: ImportRejection; readonly detail: string };

const CRC32_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

/** CRC-32 (IEEE 802.3) of the UTF-8 bytes, as 8 lowercase hex digits. */
export function crc32Hex(text: string): string {
  let crc = 0xffffffff;
  for (const byte of Buffer.from(text, 'utf8')) crc = CRC32_TABLE[(crc ^ byte) & 0xff]! ^ (crc >>> 8);
  return ((crc ^ 0xffffffff) >>> 0).toString(16).padStart(8, '0');
}

export function sha256Hex(text: string): string {
  return createHash('sha256').update(text, 'utf8').digest('hex');
}

/** Builds an import file for a profile, as the pharmacy tooling would. */
export function encodeProfileEnvelope(profile: unknown): string {
  const payload = JSON.stringify(profile);
  return JSON.stringify({ format: PROFILE_FORMAT, payload, sha256: sha256Hex(payload) });
}

export class ConfigurationStore {
  #profiles = new Map<string, TherapyProfile>();

  get(id: string): TherapyProfile | undefined {
    return this.#profiles.get(id);
  }

  get size(): number {
    return this.#profiles.size;
  }

  /** Only importProfile may call this, after verification. */
  commit(profile: TherapyProfile): void {
    this.#profiles.set(profile.id, Object.freeze({ ...profile }));
  }
}

const PROFILE_KEYS = ['id', 'name', 'drug', 'maxRateMlPerH', 'bolusCeilingMl'] as const;

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function nonEmptyString(v: unknown): v is string {
  return typeof v === 'string' && v.trim().length > 0;
}

function positiveFinite(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v) && v > 0;
}

export function validateProfileSchema(value: unknown): { ok: true; profile: TherapyProfile } | { ok: false; detail: string } {
  if (!isRecord(value)) return { ok: false, detail: 'profile is not an object' };
  const extra = Object.keys(value).filter((k) => !(PROFILE_KEYS as readonly string[]).includes(k));
  if (extra.length > 0) return { ok: false, detail: `unknown field(s): ${extra.join(', ')}` };
  const { id, name, drug, maxRateMlPerH, bolusCeilingMl } = value;
  if (!nonEmptyString(id)) return { ok: false, detail: 'id must be a non-empty string' };
  if (!nonEmptyString(name)) return { ok: false, detail: 'name must be a non-empty string' };
  if (!nonEmptyString(drug)) return { ok: false, detail: 'drug must be a non-empty string' };
  if (!positiveFinite(maxRateMlPerH) || maxRateMlPerH > DEVICE_MAX_RATE_ML_PER_H) {
    return { ok: false, detail: `maxRateMlPerH must be in (0, ${DEVICE_MAX_RATE_ML_PER_H}]` };
  }
  if (!positiveFinite(bolusCeilingMl)) return { ok: false, detail: 'bolusCeilingMl must be a positive number' };
  return { ok: true, profile: { id, name, drug, maxRateMlPerH, bolusCeilingMl } };
}

export function importProfile(file: string, store: ConfigurationStore): ImportResult {
  let envelope: unknown;
  try {
    envelope = JSON.parse(file);
  } catch {
    return { committed: false, reason: 'malformed_envelope', detail: 'file is not valid JSON' };
  }
  if (!isRecord(envelope) || envelope['format'] !== PROFILE_FORMAT) {
    return { committed: false, reason: 'malformed_envelope', detail: `expected format ${PROFILE_FORMAT}` };
  }
  const { payload, sha256, crc32 } = envelope;
  if (typeof payload !== 'string' || typeof sha256 !== 'string' || !/^[0-9a-f]{64}$/.test(sha256)) {
    return { committed: false, reason: 'malformed_envelope', detail: 'payload or sha256 missing' };
  }
  if (crc32 !== undefined && (typeof crc32 !== 'string' || !/^[0-9a-f]{8}$/.test(crc32))) {
    return { committed: false, reason: 'malformed_envelope', detail: 'crc32 must be 8 lowercase hex digits' };
  }
  if (crc32 !== undefined && crc32Hex(payload) !== crc32) {
    return { committed: false, reason: 'integrity_mismatch', detail: 'payload CRC-32 does not match crc32' };
  }

  if (sha256Hex(payload) !== sha256) {
    return { committed: false, reason: 'integrity_mismatch', detail: 'payload digest does not match sha256' };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(payload);
  } catch {
    return { committed: false, reason: 'schema_violation', detail: 'payload is not valid JSON' };
  }
  const checked = validateProfileSchema(parsed);
  if (!checked.ok) return { committed: false, reason: 'schema_violation', detail: checked.detail };

  store.commit(checked.profile);
  return { committed: true, profile: checked.profile };
}
