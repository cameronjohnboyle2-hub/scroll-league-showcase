# Project status

Last updated: 2026-10-09

## State

The authenticated MVP remains a prototype awaiting hosted setup and live acceptance. A separate disconnected portfolio export is prepared with fictional identities, coherent sample outcomes, locked dependencies, and attributed fonts/decoder code. Public publication has not occurred.

## Verified in portfolio preparation

- Original Website head `c4a1a7d2e3db72cd55e515a89149001434b52b57` was reviewed in an isolated copy; the original checkout was preserved.
- All 12 original reachable commits and 89 unique blob versions were scanned for eight known credential patterns. No matches or skipped blobs were reported. This is a bounded pattern check, not exhaustive secret/privacy clearance. Older identifying fixtures are the reason to prepare a fresh public snapshot.
- All 16 automated checks pass locally, including the consuming router's patched decoder, demo backend exclusion even with settings supplied, and consistency between sample entries/results/recaps.
- Local TypeScript and lint checks pass. Static export produces 13 routes with the portfolio flag forced, dotenv/public backend settings excluded, and a connection-denying content policy.
- Browser review covered a 1280-pixel desktop viewport and 390 × 844 phone viewport: landing, hub, entry preview, standings, matchup/missing day, recap, stakes, and profile. No horizontal overflow was observed on the measured views.
- Empty minutes disable entry saving; numeric zero previews 150 points; attempting a demo save leaves the fixture's 68-minute entry unchanged. Impossible calendar dates do not crash the preview.
- Signup/join redirect to the fictional demo; commissioner actions are disabled; external avatar previews are disabled. Direct product routes also use the demo without a query flag.
- First-load hydration was repaired using a stable shell before browser-dependent content. The final first-load/navigation checks reported no console errors.
- Screenshots in `docs/screenshots/` contain only fictional players.

## Dependency and rights limits

The npm advisory report still lists 26 affected packages (19 high, 7 moderate) across three underlying build-tool advisory families: braces, node-forge, and uuid. URL decoding and source-map-js were addressed with targeted, tested changes. See `docs/DEPENDENCY_REVIEW.md`. Optional native worklets peer warnings and deprecated tooling remain; native builds were not validated.

The font OFL notices and the decoder MIT notice are retained in both source and hosted artifact. A general reuse license for original project source remains unselected.

## Database verification boundary

The September 28 GitHub CI run passed at the original Website commit. Local Docker/Supabase tooling is unavailable in this review environment; the new [private draft PR](https://github.com/cameronjohnboyle2-hub/Scroll-League/pull/1) passed clean installation, 16 application tests, TypeScript, lint, demo export, migration reset, fictional seed, and 20 database acceptance checks at code revision 30ce66bf029a997990e9685284c355daa1022442, using Supabase CLI 2.120.0. [Verification run](https://github.com/cameronjohnboyle2-hub/Scroll-League/actions/runs/38022364059). Subsequent status-document edits do not change application code; inspect the PR's latest run before publication. No hosted database, authentication settings, SMTP delivery, production records, or EAS configuration were accessed.

## Single next step

Review the prepared fresh public snapshot and static demo, together with the new PR's CI result, then decide whether to publish the showcase. Keep original private history separate. The manual Pages workflow has been prepared but has not been run.
