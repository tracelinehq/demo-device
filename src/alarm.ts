// Alarm model. Priorities follow the IEC 60601-1-8 high / medium / low scheme.

export type AlarmPriority = 'high' | 'medium' | 'low';

export type AlarmCondition = 'air_in_line' | 'downstream_occlusion' | 'low_battery_reserve';

export interface Alarm {
  readonly condition: AlarmCondition;
  readonly priority: AlarmPriority;
  /** Monotonic device time in milliseconds when the alarm was raised. */
  readonly raisedAtMs: number;
}
