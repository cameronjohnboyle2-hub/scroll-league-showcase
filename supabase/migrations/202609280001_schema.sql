begin;

create extension if not exists pgcrypto with schema extensions;
create schema if not exists private;

create type public.member_role as enum ('commissioner', 'member');
create type public.membership_status as enum ('active', 'left');
create type public.season_status as enum ('active', 'completed');
create type public.week_status as enum ('pending', 'active', 'finalized');
create type public.entry_source as enum ('manual', 'ios_screen_time', 'android_usage_stats');
create type public.consequence_status as enum ('suggested', 'approved', 'retired');
create type public.matchup_status as enum ('scheduled', 'active', 'final');
create type public.result_outcome as enum ('win', 'loss', 'tie', 'bye');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 40),
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.leagues (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 50),
  timezone text not null,
  consequence_rules text not null check (char_length(consequence_rules) between 1 and 500),
  commissioner_id uuid not null references public.profiles(id),
  invite_code text not null unique default upper(substr(encode(extensions.gen_random_bytes(6), 'hex'), 1, 8)),
  next_consequence_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.league_members (
  id uuid primary key default gen_random_uuid(),
  league_id uuid not null references public.leagues(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role public.member_role not null default 'member',
  status public.membership_status not null default 'active',
  eligible_from_week integer not null default 1 check (eligible_from_week between 1 and 9),
  joined_at timestamptz not null default now(),
  unique (league_id, user_id)
);

create unique index one_active_league_per_user on public.league_members(user_id) where status = 'active';
create index league_members_league_idx on public.league_members(league_id, status);

create table public.seasons (
  id uuid primary key default gen_random_uuid(),
  league_id uuid not null references public.leagues(id) on delete cascade,
  season_number integer not null check (season_number > 0),
  status public.season_status not null default 'active',
  start_date date not null,
  end_date date not null,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  unique (league_id, season_number)
);

create unique index one_active_season_per_league on public.seasons(league_id) where status = 'active';

create table public.weeks (
  id uuid primary key default gen_random_uuid(),
  league_id uuid not null references public.leagues(id) on delete cascade,
  season_id uuid not null references public.seasons(id) on delete cascade,
  week_number integer not null check (week_number between 1 and 8),
  start_date date not null,
  end_date date not null check (end_date = start_date + 6),
  status public.week_status not null default 'pending',
  consequence_id uuid,
  recap jsonb,
  finalized_at timestamptz,
  created_at timestamptz not null default now(),
  unique (season_id, week_number)
);

create index weeks_due_idx on public.weeks(status, end_date);

create table public.user_targets (
  id uuid primary key default gen_random_uuid(),
  league_id uuid not null references public.leagues(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  minutes integer not null check (minutes between 1 and 1440),
  effective_from_week integer not null check (effective_from_week between 1 and 9),
  created_at timestamptz not null default now(),
  unique (league_id, user_id, effective_from_week)
);

create table public.week_participants (
  id uuid primary key default gen_random_uuid(),
  week_id uuid not null references public.weeks(id) on delete cascade,
  league_id uuid not null references public.leagues(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  target_minutes_snapshot integer not null check (target_minutes_snapshot between 1 and 1440),
  has_bye boolean not null default false,
  created_at timestamptz not null default now(),
  unique (week_id, user_id)
);

create index week_participants_league_user_idx on public.week_participants(league_id, user_id);

create table public.screen_time_entries (
  id uuid primary key default gen_random_uuid(),
  week_id uuid not null references public.weeks(id) on delete cascade,
  league_id uuid not null references public.leagues(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  local_date date not null,
  minutes integer not null check (minutes between 0 and 1440),
  source public.entry_source not null default 'manual',
  evidence_reference text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (league_id, user_id, local_date)
);

create index screen_time_entries_week_idx on public.screen_time_entries(week_id, user_id);

create table public.matchups (
  id uuid primary key default gen_random_uuid(),
  week_id uuid not null references public.weeks(id) on delete cascade,
  league_id uuid not null references public.leagues(id) on delete cascade,
  member_a_id uuid not null references public.profiles(id),
  member_b_id uuid references public.profiles(id),
  member_a_score numeric(8, 3),
  member_b_score numeric(8, 3),
  member_a_unrounded_score numeric(12, 6),
  member_b_unrounded_score numeric(12, 6),
  winner_id uuid references public.profiles(id),
  is_tie boolean not null default false,
  status public.matchup_status not null default 'scheduled',
  created_at timestamptz not null default now(),
  finalized_at timestamptz,
  check (member_b_id is null or member_a_id <> member_b_id)
);

create unique index one_member_a_matchup_per_week on public.matchups(week_id, member_a_id);
create unique index one_member_b_matchup_per_week on public.matchups(week_id, member_b_id) where member_b_id is not null;

create table public.consequences (
  id uuid primary key default gen_random_uuid(),
  league_id uuid not null references public.leagues(id) on delete cascade,
  suggested_by uuid not null references public.profiles(id),
  title text not null check (char_length(title) between 1 and 120),
  description text check (description is null or char_length(description) <= 500),
  status public.consequence_status not null default 'suggested',
  approved_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.leagues add constraint leagues_next_consequence_fk foreign key (next_consequence_id) references public.consequences(id) on delete set null;
alter table public.weeks add constraint weeks_consequence_fk foreign key (consequence_id) references public.consequences(id) on delete set null;

create table public.weekly_results (
  id uuid primary key default gen_random_uuid(),
  week_id uuid not null references public.weeks(id) on delete cascade,
  league_id uuid not null references public.leagues(id) on delete cascade,
  user_id uuid not null references public.profiles(id),
  matchup_id uuid references public.matchups(id) on delete set null,
  outcome public.result_outcome not null,
  displayed_score integer not null check (displayed_score between 0 and 150),
  rounded_daily_average numeric(8, 3) not null check (rounded_daily_average between 0 and 150),
  unrounded_score numeric(12, 6) not null check (unrounded_score between 0 and 150),
  unreported_days integer not null check (unreported_days between 0 and 7),
  assigned_consequence_id uuid references public.consequences(id) on delete set null,
  consequence_done boolean not null default false,
  finalized_at timestamptz not null default now(),
  unique (week_id, user_id)
);

create index weekly_results_league_user_idx on public.weekly_results(league_id, user_id);

create table public.analytics_events (
  id bigint generated always as identity primary key,
  event_name text not null check (event_name in ('account_created', 'league_created', 'league_joined', 'entry_submitted', 'week_finalized', 'recap_viewed', 'season_started')),
  user_id uuid references public.profiles(id) on delete set null,
  league_id uuid references public.leagues(id) on delete cascade,
  properties jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now()
);

create index analytics_events_name_time_idx on public.analytics_events(event_name, occurred_at);
create index analytics_events_league_time_idx on public.analytics_events(league_id, occurred_at);

create or replace function private.set_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_updated_at before update on public.profiles for each row execute function private.set_updated_at();
create trigger leagues_updated_at before update on public.leagues for each row execute function private.set_updated_at();
create trigger entries_updated_at before update on public.screen_time_entries for each row execute function private.set_updated_at();
create trigger consequences_updated_at before update on public.consequences for each row execute function private.set_updated_at();

create or replace function private.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles(id, display_name)
  values (new.id, coalesce(nullif(new.raw_user_meta_data ->> 'display_name', ''), split_part(new.email, '@', 1), 'Player'));
  insert into public.analytics_events(event_name, user_id) values ('account_created', new.id);
  return new;
end;
$$;

create trigger on_auth_user_created after insert on auth.users for each row execute function private.handle_new_user();

create or replace function private.is_league_member(p_league_id uuid, p_user_id uuid default auth.uid())
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.league_members
    where league_id = p_league_id and user_id = p_user_id and status = 'active'
  );
$$;

create or replace function private.is_commissioner(p_league_id uuid, p_user_id uuid default auth.uid())
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.league_members
    where league_id = p_league_id and user_id = p_user_id and status = 'active' and role = 'commissioner'
  );
$$;

revoke all on schema private from public, anon, authenticated;
revoke all on all functions in schema private from public, anon, authenticated;
grant usage on schema private to authenticated;
grant execute on function private.is_league_member(uuid, uuid), private.is_commissioner(uuid, uuid) to authenticated;

alter table public.profiles enable row level security;
alter table public.leagues enable row level security;
alter table public.league_members enable row level security;
alter table public.seasons enable row level security;
alter table public.weeks enable row level security;
alter table public.user_targets enable row level security;
alter table public.week_participants enable row level security;
alter table public.screen_time_entries enable row level security;
alter table public.matchups enable row level security;
alter table public.consequences enable row level security;
alter table public.weekly_results enable row level security;
alter table public.analytics_events enable row level security;

create policy profiles_read_shared_league on public.profiles for select to authenticated using (
  id = auth.uid() or exists (
    select 1 from public.league_members mine
    join public.league_members theirs on theirs.league_id = mine.league_id
    where mine.user_id = auth.uid() and mine.status = 'active' and theirs.user_id = profiles.id and theirs.status = 'active'
  )
);
create policy profiles_update_self on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

create policy leagues_read_member on public.leagues for select to authenticated using (private.is_league_member(id));
create policy league_members_read_member on public.league_members for select to authenticated using (private.is_league_member(league_id));
create policy seasons_read_member on public.seasons for select to authenticated using (private.is_league_member(league_id));
create policy weeks_read_member on public.weeks for select to authenticated using (private.is_league_member(league_id));
create policy targets_read_member on public.user_targets for select to authenticated using (private.is_league_member(league_id));
create policy participants_read_member on public.week_participants for select to authenticated using (private.is_league_member(league_id));
create policy entries_read_member on public.screen_time_entries for select to authenticated using (private.is_league_member(league_id));
create policy matchups_read_member on public.matchups for select to authenticated using (private.is_league_member(league_id));
create policy consequences_read_member on public.consequences for select to authenticated using (private.is_league_member(league_id));
create policy results_read_member on public.weekly_results for select to authenticated using (private.is_league_member(league_id));
create policy analytics_read_commissioner on public.analytics_events for select to authenticated using (league_id is not null and private.is_commissioner(league_id));

create policy entries_insert_self on public.screen_time_entries for insert to authenticated with check (
  user_id = auth.uid() and private.is_league_member(league_id) and exists (
    select 1
    from public.weeks week
    join public.leagues league on league.id = week.league_id
    where week.id = week_id
      and week.league_id = screen_time_entries.league_id
      and week.status = 'active'
      and screen_time_entries.local_date between week.start_date and week.end_date
      and screen_time_entries.local_date <= (now() at time zone league.timezone)::date
      and exists (
        select 1 from public.week_participants participant
        where participant.week_id = week.id and participant.user_id = auth.uid()
      )
  )
);
create policy entries_update_self on public.screen_time_entries for update to authenticated using (
  user_id = auth.uid() and exists (select 1 from public.weeks where id = week_id and status = 'active')
) with check (
  user_id = auth.uid() and private.is_league_member(league_id) and exists (
    select 1
    from public.weeks week
    join public.leagues league on league.id = week.league_id
    where week.id = week_id
      and week.league_id = screen_time_entries.league_id
      and week.status = 'active'
      and screen_time_entries.local_date between week.start_date and week.end_date
      and screen_time_entries.local_date <= (now() at time zone league.timezone)::date
      and exists (
        select 1 from public.week_participants participant
        where participant.week_id = week.id and participant.user_id = auth.uid()
      )
  )
);
create policy entries_delete_self on public.screen_time_entries for delete to authenticated using (
  user_id = auth.uid() and exists (select 1 from public.weeks where id = week_id and status = 'active')
);

revoke all on all tables in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;
grant usage on schema public to authenticated;
grant usage on type public.member_role, public.membership_status, public.season_status, public.week_status,
  public.entry_source, public.consequence_status, public.matchup_status, public.result_outcome to authenticated;
grant select on public.profiles, public.leagues, public.league_members, public.seasons, public.weeks, public.user_targets,
  public.week_participants, public.screen_time_entries, public.matchups, public.consequences, public.weekly_results to authenticated;
grant update(display_name, avatar_url) on public.profiles to authenticated;
grant insert, update, delete on public.screen_time_entries to authenticated;
grant select on public.analytics_events to authenticated;
grant usage, select on all sequences in schema public to authenticated;

commit;
