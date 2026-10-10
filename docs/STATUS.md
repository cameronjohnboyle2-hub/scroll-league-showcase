# Project status

Last updated: 2026-10-09

## State

The disconnected fictional portfolio demo is [live](https://cameronjohnboyle2-hub.github.io/scroll-league-showcase/) and its source is public with fresh history. The authenticated MVP remains a prototype awaiting hosted setup and live acceptance. Fictional identities, coherent sample outcomes, locked dependencies, and attributed fonts/decoder code are included.

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

Local Docker/Supabase tooling is unavailable in this review environment. [Public CI run 38023608565](https://github.com/cameronjohnboyle2-hub/scroll-league-showcase/actions/runs/38023608565) passed clean installation, 16 application tests, TypeScript, lint, demo export, migration reset, fictional seed, and 20 database acceptance checks at the first public commit fb9d9a501d38a1dd4a6e5223affa4808f6bf52b3, using Supabase CLI 2.120.0. That root commit is byte-identical to the reviewed source archive and has no parent commit. The archive uses CRLF line endings in 79 text files, so its Git tree differs from the original normalized tree only in those line endings; both image files are unchanged. No hosted database, authentication settings, SMTP delivery, production records, or EAS configuration were accessed.

## Public demo verification

[Pages run 38023651922](https://github.com/cameronjohnboyle2-hub/scroll-league-showcase/actions/runs/38023651922) passed both build and deployment. An unauthenticated browser check verified landing navigation, entry score previews and read-only feedback, unchanged fictional entries after a save attempt, standings, missing-day labels, week-two recap, and direct `/home` access without a demo query. A 390 by 844 phone viewport fit its width. The hosted HTML includes the connection-denying content policy; reviewed first-load/navigation flows reported no console errors. These checks do not establish production or native behavior.

## Single next step

Use the public demo and source in the portfolio. A separate authenticated pilot still needs hosted configuration, multi-account acceptance, consent, and measurable user outcomes. Keep the original private history separate.
