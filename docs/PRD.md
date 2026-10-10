# Scroll League — MVP Product Requirements

Status: build-ready handoff

Last updated: 2026-09-28

Product owner: Cameron Boyle

## 1. Summary

Build a private, mobile-first competition for existing friend groups. Members enter recreational screen time each day, compete against their own targets in weekly head-to-head matchups, and return for standings, a last-place consequence, and a funny recap. The pilot tests whether a social league keeps people participating longer than an individual tracker.

The pilot opens through a browser link. Use Expo Router, React Native Web, TypeScript, and Supabase so the same app has a path to iOS and Android. Expo Router supports web and native routes, and Expo supports web deployment through EAS Hosting.

References: [Expo Router](https://docs.expo.dev/router/introduction/), [EAS Hosting](https://docs.expo.dev/eas/hosting/)

## 2. Product behavior

### 2.1 Onboarding and leagues

- Sign up with email and password.
- Choose a display name and optional avatar.
- Create or join a private league by invite code or `/join?code=...` link.
- Recommend 4–10 members; permit 2–10.
- Show the consequence rules before joining.
- An account belongs to one active league in the MVP.

### 2.2 Season

- The commissioner starts an eight-week season once the group is ready.
- Day 1 is the league's current local calendar day.
- Each week contains seven local calendar days.
- Store an IANA time zone on the league at creation.
- Pair active members each week while minimizing repeat opponents.
- Rotate byes for odd-sized leagues. A bye gives neither a win nor a loss.
- Members who join during a week enter competition the following week.

### 2.3 Targets and entries

- Each member sets a daily recreational-minute target before competing.
- Targets are visible to league members.
- Allow one manual entry of 0–1,440 minutes per local date.
- An entry remains editable until its week closes.
- Target changes take effect the next week.
- Save a weekly target snapshot so past scores never change.

### 2.4 Scoring

For a reported day:

```text
daily score = clamp(0, 150, round(100 + 100 × (target − minutes) / target))
```

- Meeting a target earns 100.
- Using half the target earns 150.
- Using twice the target earns 0.
- An unreported day earns 0 and remains visibly labeled `unreported`.
- The final weekly score is the sum of seven daily scores divided by seven.
- During an active week, show the average for elapsed days as the provisional pace; future days do not count yet.
- Show raw minutes alongside every normalized score.

### 2.5 Results

- Higher weekly score wins the matchup.
- Resolve a rounded-score tie using the unrounded score.
- Record an exact tie as a tie.
- Sort standings by win percentage, then total season score, then fewer unreported days.
- Overall last place is the lowest final weekly score.
- An exact tie for overall last means no consequence that week.
- A member with a bye remains eligible for overall last place.

### 2.6 Consequences

- Members agree to the league's playful consequence rules when joining.
- Any member may suggest a consequence.
- The commissioner manages the pool and selects the next week's stake before it starts.
- If none is selected, that week has no stake.
- Show the selected stake in advance.
- Assign it only to the overall last-place finisher.
- Provide a simple self-reported `done` state.
- Keep examples modest. Provide no payments or enforcement.

### 2.7 Screens

- Onboarding
- Home with today's entry, target, matchup, rank, and activity
- League with members and standings
- Matchup with daily scores, raw time, trend, and result
- Fast Entry
- Consequences
- Deterministic Weekly Recap
- Profile and settings
- Read-only `/demo` route that immediately displays “Daybreak Demo” with Demo Atlas, Demo Birch, Demo Cedar, and Demo Dune (portfolio fixture decision D-012) across three realistic weeks

Use compact sports-style cards, strong type, records, and clear numbers.

## 3. Out of scope

- Blocking
- Device usage APIs
- Public leaderboards
- Chat
- Subscriptions
- Payments
- AI coaching
- Complex achievements
- Notifications

The activity feed uses league events such as entries and finalized results.

## 4. Architecture and data

### 4.1 Frontend

- Use fixed Expo Router pages with query parameters for invite and recap links, avoiding dynamic paths that complicate static web export.
- Use a responsive layout that is comfortable at phone widths and usable on desktop.
- Keep scoring display logic, Supabase calls, and UI components separate.

### 4.2 Backend

Use Supabase Auth and Postgres. Provide migrations for:

- `profiles`
- `leagues`
- `league_members`
- `seasons`
- `weeks`
- `week_participants`, including target snapshots
- `user_targets`
- `screen_time_entries`
- `matchups`
- `consequences`
- `weekly_results`
- `analytics_events`

Derive season standings from finalized weekly results.

Store `source` on entries (`manual` now; native sources later) and a nullable evidence reference. Do not build screenshot upload in the MVP.

### 4.3 Access control

- Enable row-level security and explicit grants on every exposed table.
- Members can read only their leagues' data.
- Users edit only their own entries and profile.
- Commissioner actions use constrained database functions.
- Joining by code uses a server-side function.
- No service-role key reaches the browser.

Reference: [Supabase row-level security](https://supabase.com/docs/guides/database/postgres/row-level-security)

### 4.4 Week transition

Create an idempotent database function that:

1. Locks and finalizes due weeks.
2. Saves matchup and weekly results.
3. Generates a stable, template-based recap.
4. Creates the next week when appropriate.

Run it on a short Supabase Cron schedule. A repeat run must change nothing. After week eight, show season results and allow the commissioner to start a new season.

Reference: [Supabase Cron](https://supabase.com/docs/guides/cron)

### 4.5 Usage provider

Define a small `UsageDataProvider` interface for reading and submitting daily usage. Implement manual entry first. Document where iOS Screen Time and Android UsageStats providers would obtain permission, normalize minutes, and write through the same entry contract.

### 4.6 Analytics

The source handoff calls for seven analytics events but does not enumerate their names. Use this working event contract, with user, league, and timestamp where applicable, unless the product owner replaces it before Phase 4:

1. `account_created`
2. `league_created`
3. `league_joined`
4. `entry_submitted`
5. `week_finalized`
6. `recap_viewed`
7. `season_started`

Define an active league week as at least half its roster submitting on four or more days. Supply simple queries for:

- Week 1, 2, 4, and 8 league retention
- Member participation
- Entries per user
- Recap views
- Season restarts

### 4.7 Email

For live student signup, configure custom SMTP with Supabase email confirmation. Supabase's default sender is restricted to authorized addresses and a very low rate limit, so it cannot support the planned pilot.

Reference: [Supabase SMTP](https://supabase.com/docs/guides/auth/auth-smtp)

## 5. Build sequence

1. Create the Expo project, design system, fixed routes, and read-only demo using relative-date fixtures.
2. Add Supabase migrations, authentication, invite flow, and league access policies.
3. Add targets, manual entries, live standings, pairing, week finalization, consequences, and recaps.
4. Add analytics, setup documentation, `.env.example`, reproducible seed data, and a deployed browser pilot link.

## 6. Delivery requirements

The implementing agent delivers:

- Source code
- Supabase migrations
- Reproducible seed script
- README and setup/local-run instructions
- Brief architecture explanation
- iOS Screen Time ingestion follow-up note
- Android UsageStats ingestion follow-up note

## 7. Verification requirements

Test the full flow with four separate accounts, then five accounts to verify a rotating bye. Verify:

- Cross-league data isolation
- Missing days
- Target changes
- Rounded and exact ties
- Week rollover
- Repeat finalization
- Phone-sized browser UI

The app is accepted when a new group can join, finish a week, see a stable result and recap, and continue into the next week without manual database intervention.

## 8. First product experiment

- Recruit at least three friend groups for two full weeks.
- Review league activity.
- Interview members about whether matchups, recaps, or the consequence gave them a reason to return.
- Prioritize follow-up experiments on target fairness, consequences versus no consequences, and which recap moments members actually share.

## 9. Assumptions

- Browser-link access takes priority; native app builds come later.
- Leagues trust members' manually reported minutes during the pilot.
- The commissioner controls season starts and weekly stake selection.
- Live deployment requires a Supabase project, custom SMTP credentials, and an Expo account.
- The demo uses fictional data and remains separate from real league records.
