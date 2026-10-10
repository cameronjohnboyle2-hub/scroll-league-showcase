# Authenticated prototype setup

This runbook is for the separate pilot configuration. The portfolio demo uses `npm run export:demo`, has no backend, and does not require this setup. Live setup and delivery have not been verified by the portfolio review.

## Local database

Install the official Supabase CLI and Docker. Run `supabase start`, `supabase db reset`, and `supabase test db`. Reset uses disposable fictional seed accounts with the documented local-only password; never load that seed into production.

Copy `.env.example` to `.env`. Use the API URL and publishable/anonymous key from `supabase status`:

```dotenv
EXPO_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-local-publishable-key
```

Leave `EXPO_PUBLIC_PORTFOLIO_DEMO` unset. Run `npm run web`. The client must never receive a service-role key.

## Hosted pilot prerequisites

Use a separate Supabase project. Link it with `supabase link --project-ref YOUR_PROJECT_REF`, then apply migrations with `supabase db push`. Configure the app URL and authentication redirect allowlist. Configure custom SMTP and verify confirmed-email signup with two test accounts before inviting people. Verify the database's deployed RLS/grants and cross-league isolation, and confirm the finalizer's scheduled job runs once per boundary without duplicate results.

Configure an Expo/EAS project and only the two client-safe backend settings above. Export with `npm run export:web`; deploy using the currently configured EAS deployment workflow after explicit deployment review. Record the resulting URL, exact revision, delivery checks, and user-flow evidence in `docs/STATUS.md`.

Complete phone-browser signup/join, entry editing, queued target changes, rollover, recaps, and a second-league isolation check. Native screen-time ingestion and iOS/Android device validation are separate follow-ups.
