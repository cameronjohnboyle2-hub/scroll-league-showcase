# Implementation plan

Check an item only after the implementation and its stated verification both pass.

## Phase 1 — Product shell and demo

- [ ] Initialize Expo Router with TypeScript and React Native Web.
- [ ] Add formatting, linting, type-checking, and test scripts.
- [ ] Create responsive design tokens and sports-card primitives.
- [ ] Add all fixed routes from `docs/ARCHITECTURE.md`.
- [x] Implement pure scoring helpers with boundary tests.
- [x] Implement `/demo` with “Daybreak Demo,” Demo Atlas, Demo Birch, Demo Cedar, and Demo Dune.
- [x] Use relative-date fixtures covering three realistic weeks.
- [x] Confirm demo performs no Supabase read or write.
- [ ] Verify phone-width and desktop layouts.

Exit criterion: a reviewer can open `/demo` and understand the core loop without an account.

## Phase 2 — Identity, leagues, and access

- [x] Create the Supabase project configuration and `.env.example`.
- [ ] Add migrations for profiles, leagues, membership, seasons, and weeks.
- [ ] Add explicit grants and enable RLS on every exposed table.
- [ ] Add email/password signup, confirmation, login, and logout.
- [ ] Add display-name and optional-avatar profile setup.
- [ ] Add league creation with IANA time zone and consequence rules.
- [ ] Add secure join-by-code database function.
- [ ] Add `/join?code=...` flow with rules shown before consent.
- [ ] Enforce one active league per account and roster limit of ten.
- [ ] Test two-league isolation with separate accounts.

Exit criterion: a new user can safely create or join a league, and cannot read or mutate another league's records.

## Phase 3 — Competition loop

- [ ] Add target history and weekly participant target snapshots.
- [ ] Add manual `UsageDataProvider` and one-entry-per-local-date storage.
- [ ] Enforce 0–1,440 minutes and closed-week immutability.
- [ ] Implement provisional pace and raw-minute presentation.
- [ ] Implement deterministic repeat-minimizing pairing.
- [ ] Implement balanced rotating byes.
- [ ] Add matchup views and live standings.
- [ ] Add consequence suggestion, moderation, selection, assignment, and done state.
- [ ] Implement transactional idempotent finalization.
- [ ] Save matchup results, weekly results, and versioned recap payloads.
- [ ] Create the next week or close the season after week eight.
- [ ] Schedule finalization with Supabase Cron.

Exit criterion: a league advances across a boundary with stable scores, results, stake assignment, recap, and next-week setup without manual database intervention.

## Phase 4 — Pilot readiness

- [x] Add all seven analytics events from the PRD.
- [x] Add SQL queries for required pilot metrics.
- [x] Add reproducible seed data.
- [x] Add complete local setup and deployment instructions.
- [ ] Configure and test custom SMTP in the live project.
- [ ] Deploy web through EAS Hosting.
- [x] Document iOS Screen Time and Android UsageStats follow-ups.
- [ ] Test browser UI at representative phone widths.

Exit criterion: the public pilot URL supports confirmed-email onboarding and captures the required experiment data.

## Acceptance verification matrix

| Scenario | Required evidence |
|---|---|
| Four-account flow | Signup, join, targets, entries, pairings, results, recap, next week |
| Five-account flow | Fair rotating bye; bye has no W/L and remains last-place eligible |
| Cross-league isolation | Direct select/update/function attempts cannot access the other league |
| Missing day | Scores zero and stays visibly `unreported`, distinct from reported zero minutes |
| Target change | Current week remains unchanged; next snapshot uses the new target |
| Rounded tie | Unrounded score selects the winner |
| Exact tie | Matchup is a tie; exact overall-last tie assigns no consequence |
| Week rollover | Local-calendar boundary finalizes once and creates the correct next week |
| Repeat finalization | Repeated calls produce no duplicate or changed result |
| Season completion | Week eight closes season and exposes new-season commissioner action |
| Responsive UI | Core flow works on phone-sized browsers and desktop |

## Portfolio preparation verification (2026-10-09)

- [x] Review original reachable history and exact source baseline with bounded credential/fixture checks.
- [x] Replace identifying examples with invented players and derive consistent sample outcomes.
- [x] Force a backend-free portfolio build and disable account/external-avatar/commissioner paths.
- [x] Retain a dependency lock, targeted decoder/source-map fixes, and third-party notices.
- [x] Pass 16 local tests, TypeScript, lint, and static export.
- [x] Verify fictional browser flows at desktop and phone widths, including zero/missing reports and a clean first load.
- [x] Confirm the new draft PR's fresh database CI at code revision 30ce66bf029a997990e9685284c355daa1022442: 20 checks pass.
- [x] Approve and publish the fresh source snapshot and disconnected static artifact; public CI and Pages runs pass, and hosted core flows were browser-checked on 2026-10-09.
- [ ] Configure and accept the separate hosted pilot; native-device validation remains separate.

The earlier pilot checklist above retains its own evidence boundary. Portfolio browser verification does not complete live onboarding, database deployment, recruitment, or retention experiments.

## Pilot experiment

- [ ] Recruit at least three friend groups.
- [ ] Run each group for two complete weeks.
- [ ] Review active-league-week retention and participation.
- [ ] Interview members about matchups, recaps, and consequences.
- [ ] Choose the next experiment: target fairness, consequences vs. none, or recap shareability.
