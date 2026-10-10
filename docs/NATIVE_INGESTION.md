# Native usage ingestion follow-up

The MVP ships manual reporting only. Both future native implementations must normalize their result to the same `DailyUsageInput` and submit through `UsageDataProvider`; neither should write directly to arbitrary database tables.

## Shared contract

```ts
type DailyUsageInput = {
  localDate: string;
  minutes: number;
  source: 'manual' | 'ios_screen_time' | 'android_usage_stats';
  evidenceRef: string | null;
};
```

The league's IANA time zone—not the device's current time zone—determines `localDate`. Normalize totals to an integer from 0 through 1,440. Keep reported zero distinct from no record.

## iOS Screen Time provider

Use a development build; this cannot be implemented in Expo Go.

1. Add the Family Controls entitlement and the corresponding Expo config plugin/native module.
2. Request individual authorization with `AuthorizationCenter` after a user-facing explanation.
3. Let the user choose the applications/categories considered recreational with `FamilyActivityPicker`.
4. Use Device Activity reports to aggregate usage within league-local day boundaries.
5. Convert the aggregate to integer minutes and submit with `source: 'ios_screen_time'`.
6. Store only an opaque nullable evidence reference if a future verification artifact exists; do not upload screenshots by default.

Before implementation, validate Apple's entitlement approval and App Review position for self-tracking, how opaque application tokens can be persisted, shared-device behavior, daylight-saving transitions, and report latency.

## Android UsageStats provider

Use a development build with a small Kotlin module.

1. Explain why Usage Access is needed, then open `Settings.ACTION_USAGE_ACCESS_SETTINGS`.
2. Verify access with `AppOpsManager`; permission is not a normal runtime dialog.
3. Query `UsageStatsManager` or usage events for the league-local day interval.
4. Maintain an explicit package/category policy for what counts as recreational.
5. Reconstruct foreground intervals defensively, cap the normalized total at 1,440 minutes, and submit with `source: 'android_usage_stats'`.

Test Samsung, Pixel, and at least one aggressively battery-managed OEM. Validate duplicate/missing events, device restarts, time-zone changes, daylight-saving transitions, work profiles, multi-window use, and vendor-specific settings labels.

## Product and privacy guardrails

- Ask permission only when the member enables automatic import.
- Explain exactly what is read and what leaves the device.
- Prefer sending the daily aggregate, not per-app histories.
- Let users disable import and return to manual reporting.
- Keep imported entries editable until the week closes unless the league explicitly chooses a stricter policy in a later experiment.
- Never turn the provider into app blocking or surveillance in this MVP.
