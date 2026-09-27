// Alarm model. Priorities follow the IEC 60601-1-8 high / medium / low scheme.

export type AlarmPriority = 'high' | 'medium' | 'low';

export type AlarmCondition = 'air_in_line' | 'downstream_occlusion' | 'low_battery_reserve';

export interface Alarm {
  readonly condition: AlarmCondition;
  readonly priority: AlarmPriority;
  /** Monotonic device time in milliseconds when the alarm was raised. */
  readonly raisedAtMs: number;
}

/** SRS-237 (v1): what the clinician checked before silencing an occlusion alarm. */
export const OCCLUSION_CAUSES = ['line_clamped', 'line_kinked', 'filter_blocked', 'other'] as const;
export type OcclusionCause = (typeof OCCLUSION_CAUSES)[number];

/** One device event log entry: an acknowledged alarm and the cause the clinician selected. */
export interface AlarmAcknowledgement {
  readonly kind: 'alarm_acknowledged';
  readonly condition: AlarmCondition;
  readonly cause: OcclusionCause;
  readonly atMs: number;
}
