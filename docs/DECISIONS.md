# Decision log

Append decisions; do not rewrite history. Proposed changes to the PRD should cite a decision entry.

## D-001 — Browser-first, cross-platform foundation

- Date: 2026-09-28
- Status: accepted
- Decision: Build with Expo Router, React Native Web, and TypeScript; deploy the pilot as a browser link through EAS Hosting while preserving native routes.
- Consequence: avoid web-only framework assumptions in core product code.

## D-002 — Supabase owns authentication and persistence

- Date: 2026-09-28
- Status: accepted
- Decision: Use Supabase Auth, Postgres, RLS, constrained database functions, and Cron.
- Consequence: schema, grants, policies, and functions must be reproducible through migrations.

## D-003 — Manual reporting for the pilot

- Date: 2026-09-28
- Status: accepted
- Decision: Trust manual entries in the MVP and place them behind a `UsageDataProvider` interface.
- Consequence: native ingestion is a follow-up and must not delay pilot validation.

## D-004 — Fixed routes for static web export

- Date: 2026-09-28
- Status: accepted
- Decision: Use fixed routes and query parameters for join, matchup, and recap context.
- Consequence: do not add dynamic Expo Router path segments during the MVP.

## D-005 — Historical competition data is immutable

- Date: 2026-09-28
- Status: accepted
- Decision: Snapshot weekly targets and persist finalized matchups, results, and recap payloads.
- Consequence: current profile or target changes cannot rewrite past outcomes.

## D-006 — Private leagues and modest consequences

- Date: 2026-09-28
- Status: accepted
- Decision: Limit leagues to 2–10 members, require agreement to visible rules, and keep consequences self-reported without payment or enforcement.
- Consequence: public discovery, financial stakes, and compliance mechanisms are out of scope.

## D-007 — Working analytics event contract

- Date: 2026-09-28
- Status: proposed; confirm before Phase 4
- Decision: Until replaced, use `account_created`, `league_created`, `league_joined`, `entry_submitted`, `week_finalized`, `recap_viewed`, and `season_started` as the seven requested events.
- Context: the source handoff requires seven events but does not enumerate their names.
- Consequence: migrations and queries should centralize event names so this contract can be revised safely before pilot data collection.

## D-008 — Working win-percentage treatment for ties

- Date: 2026-09-28
- Status: proposed; confirm before Phase 3
- Decision: Calculate win percentage as `(wins + 0.5 × ties) / (wins + losses + ties)`; exclude byes from the denominator.
- Context: the source handoff defines ties and byes but not their exact win-percentage math.
- Consequence: standings tests must make this assumption explicit and change with the decision if needed.

## D-009 — Freeze the seven-event pilot contract

- Date: 2026-09-28
- Status: accepted for the MVP
- Decision: Ship the D-007 event list: `account_created`, `league_created`, `league_joined`, `entry_submitted`, `week_finalized`, `recap_viewed`, and `season_started`.
- Consequence: the database allowlist, server-side emitters, client recap event, and pilot queries use these names consistently.

## D-010 — Treat a tie as half a win

- Date: 2026-09-28
- Status: accepted for the MVP
- Decision: Adopt D-008's win percentage formula and exclude byes from games played.
- Consequence: both the pure standings implementation and database snapshot use the same calculation.

## D-011 — Pair Barlow Condensed with Inter

- Date: 2026-09-28
- Status: accepted
- Decision: Use Barlow Condensed Black/Bold for the competitive display layer and Inter Regular/Semibold/Bold for interface copy, labels, and data.
- Context: Barlow's condensed, signage-derived construction supports a compact sports identity; Inter is designed for screen readability and includes tabular numerals for dense score data.
- Consequence: load the five required weights locally through Expo Font, use semantic font tokens, and avoid runtime requests to external font CDNs.

## D-012 — Disconnected fictional portfolio export

- Date: 2026-10-09
- Status: accepted for portfolio preparation
- Decision: Add a dedicated portfolio flag/export that prevents backend client initialization even when settings are supplied. Use invented Demo Atlas/Birch/Cedar/Dune identities and derive all sample outcomes from their entries. Disable external avatar previews, keep actions read-only, and redirect account routes to the demo.
- Context: Cameron requested a reviewed portfolio release. This presentation/privacy decision replaces the old examples without changing competition rules. Authenticated pilot configuration remains a separate build.
- Consequence: publish only a reviewed static demo artifact; prepare a fresh source snapshot for public review rather than changing visibility on the original repository's history.

## D-013 — Scoped dependency compatibility patch

- Date: 2026-10-09
- Status: accepted for the portfolio build
- Decision: Pin source-map-js to its patched release and adapt the official patched URL decoder's export boundary to CommonJS for query-string 7, preserving its algorithm and MIT notice. Retain the current Expo SDK.
- Alternative: a forced SDK downgrade suggested by npm audit or a major SDK migration; either broadens scope and needs separate native validation.
- Consequence: route-parser regression tests and attribution are required. Remaining upstream build-tool advisories are documented, not treated as cleared.


## 2026-10-13 — Make the public mini-showcase boundary explicit

Cameron requested prominent labels distinguishing the small public demo from the larger original product. Add a shared notice on every demo screen and explain the full authenticated prototype in the README. Keep fictional fixtures and disconnected behavior; this presentation change adds no product capability and makes no live-pilot claim.
