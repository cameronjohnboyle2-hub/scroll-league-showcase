# Agent instructions

## Mission

Build the Scroll League browser-first MVP described in `docs/PRD.md`. Treat that document as the canonical product specification. Do not expand scope without recording a decision in `docs/DECISIONS.md`.

## Working memory

Use these files to keep the repository legible across agent handoffs:

- `docs/PRD.md`: product requirements and acceptance criteria; change only with an explicit product decision.
- `docs/ARCHITECTURE.md`: intended system boundaries and contracts; update when implementation changes them.
- `docs/IMPLEMENTATION_PLAN.md`: ordered work and verification checklist; check off only verified work.
- `docs/DECISIONS.md`: append dated decisions, alternatives, and consequences.
- `docs/STATUS.md`: update at the end of every meaningful work session with what changed, what was verified, blockers, and the single best next step.

## Non-negotiable behavior

- Browser-link access is the pilot priority; retain Expo's iOS and Android path.
- Keep routes fixed and use query parameters for invite and recap links.
- Treat the league's IANA time zone as authoritative for local dates and week boundaries.
- Persist weekly target snapshots. Never recompute historical scores from a current target.
- Preserve reported zero minutes as distinct from an unreported day.
- Use unrounded scores for tie-breaking after displayed rounded scores tie; exact ties remain ties.
- A bye produces neither a win nor a loss and does not exempt a member from overall last place.
- Week finalization must be transactional and idempotent.
- Never expose a Supabase service-role key to browser or native clients.
- Enable RLS and explicit grants on every exposed table before considering a data flow complete.
- The `/demo` experience is read-only, uses fictional relative-date fixtures, and never reads or writes production league records.

## Engineering boundaries

- Keep pure scoring, date, pairing, standings, and recap logic separate from UI and Supabase access.
- Put database changes in versioned Supabase migrations. Do not make undocumented dashboard-only schema changes.
- Prefer constrained database functions for commissioner actions and code redemption.
- Use a `UsageDataProvider` boundary. Ship manual entry only; document native providers without implementing them.
- Add deterministic tests around scoring, missing days, target snapshots, ties, byes, rollover, and repeat finalization.
- Do not add excluded features: blocking, device usage APIs, public leaderboards, chat, subscriptions, payments, AI coaching, complex achievements, or notifications.

## Completion discipline

For each phase:

1. Implement the smallest complete vertical slice.
2. Run formatting, type checking, and relevant automated tests.
3. Verify the affected flow at phone width and a desktop width.
4. Update `docs/IMPLEMENTATION_PLAN.md` and `docs/STATUS.md` with evidence.
5. Record any material deviation in `docs/DECISIONS.md`.

Do not claim deployment, cross-account isolation, email delivery, or mobile-browser verification without direct evidence.
