begin;

create or replace function private.current_league_id(p_user_id uuid default auth.uid())
returns uuid language sql stable security definer set search_path = '' as $$
  select league_id from public.league_members
  where user_id = p_user_id and status = 'active'
  order by joined_at desc limit 1;
$$;

create or replace function private.league_local_date(p_league_id uuid)
returns date language sql stable security definer set search_path = '' as $$
  select (now() at time zone timezone)::date from public.leagues where id = p_league_id;
$$;

create or replace function private.daily_score(p_target integer, p_minutes integer)
returns integer language sql immutable set search_path = '' as $$
  select greatest(0, least(150, round(100 + 100 * (p_target - p_minutes)::numeric / p_target)::integer));
$$;

create or replace function private.daily_unrounded_score(p_target integer, p_minutes integer)
returns numeric language sql immutable set search_path = '' as $$
  select greatest(0::numeric, least(150::numeric, 100 + 100 * (p_target - p_minutes)::numeric / p_target));
$$;

create or replace function private.create_week(p_season_id uuid, p_week_number integer, p_start_date date)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_league_id uuid;
  v_week_id uuid;
  v_stake_id uuid;
  v_players uuid[];
  v_rotated uuid[];
  v_total integer;
  v_tail_count integer;
  v_rotation integer;
  v_index integer;
  v_left uuid;
  v_right uuid;
begin
  select league_id into strict v_league_id from public.seasons where id = p_season_id;
  if p_week_number not between 1 and 8 then raise exception 'INVALID_WEEK_NUMBER'; end if;

  select next_consequence_id into v_stake_id from public.leagues where id = v_league_id for update;
  update public.leagues set next_consequence_id = null where id = v_league_id;

  insert into public.weeks(league_id, season_id, week_number, start_date, end_date, status, consequence_id)
  values (v_league_id, p_season_id, p_week_number, p_start_date, p_start_date + 6, 'active', v_stake_id)
  returning id into v_week_id;

  insert into public.week_participants(week_id, league_id, user_id, target_minutes_snapshot)
  select v_week_id, v_league_id, member.user_id, target.minutes
  from public.league_members member
  cross join lateral (
    select minutes from public.user_targets
    where league_id = v_league_id and user_id = member.user_id and effective_from_week <= p_week_number
    order by effective_from_week desc, created_at desc limit 1
  ) target
  where member.league_id = v_league_id and member.status = 'active' and member.eligible_from_week <= p_week_number
  order by member.joined_at, member.user_id;

  select array_agg(participant.user_id order by member.joined_at, participant.user_id)
  into v_players
  from public.week_participants participant
  join public.league_members member on member.league_id = participant.league_id and member.user_id = participant.user_id
  where participant.week_id = v_week_id;

  v_total := coalesce(array_length(v_players, 1), 0);
  if v_total < 2 then raise exception 'NOT_ENOUGH_ELIGIBLE_MEMBERS'; end if;
  if v_total % 2 = 1 then
    v_players := array_append(v_players, null::uuid);
    v_total := v_total + 1;
  end if;

  v_tail_count := v_total - 1;
  v_rotation := (p_week_number - 1) % v_tail_count;
  v_rotated := array[v_players[1]];
  for v_index in 0..v_tail_count - 1 loop
    v_rotated := array_append(v_rotated, v_players[2 + ((v_index + v_rotation) % v_tail_count)]);
  end loop;

  for v_index in 1..v_total / 2 loop
    v_left := v_rotated[v_index];
    v_right := v_rotated[v_total - v_index + 1];
    if v_left is null then
      update public.week_participants set has_bye = true where week_id = v_week_id and user_id = v_right;
      insert into public.matchups(week_id, league_id, member_a_id, member_b_id, status) values (v_week_id, v_league_id, v_right, null, 'active');
    elsif v_right is null then
      update public.week_participants set has_bye = true where week_id = v_week_id and user_id = v_left;
      insert into public.matchups(week_id, league_id, member_a_id, member_b_id, status) values (v_week_id, v_league_id, v_left, null, 'active');
    else
      insert into public.matchups(week_id, league_id, member_a_id, member_b_id, status) values (v_week_id, v_league_id, v_left, v_right, 'active');
    end if;
  end loop;
  return v_week_id;
end;
$$;

revoke all on function private.current_league_id(uuid) from public, anon, authenticated;
revoke all on function private.league_local_date(uuid) from public, anon, authenticated;
revoke all on function private.daily_score(integer, integer) from public, anon, authenticated;
revoke all on function private.daily_unrounded_score(integer, integer) from public, anon, authenticated;
revoke all on function private.create_week(uuid, integer, date) from public, anon, authenticated;

create or replace function public.update_profile(p_display_name text, p_avatar_url text default null)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  if char_length(trim(p_display_name)) not between 1 and 40 then raise exception 'INVALID_DISPLAY_NAME'; end if;
  update public.profiles set display_name = trim(p_display_name), avatar_url = nullif(trim(p_avatar_url), '') where id = auth.uid();
end;
$$;

create or replace function public.create_league(
  p_name text,
  p_timezone text,
  p_consequence_rules text,
  p_target_minutes integer
)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_league public.leagues;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  if exists (select 1 from public.league_members where user_id = auth.uid() and status = 'active') then raise exception 'ACTIVE_LEAGUE_EXISTS'; end if;
  if char_length(trim(p_name)) not between 1 and 50 then raise exception 'INVALID_LEAGUE_NAME'; end if;
  if char_length(trim(p_consequence_rules)) not between 1 and 500 then raise exception 'INVALID_CONSEQUENCE_RULES'; end if;
  if p_target_minutes not between 1 and 1440 then raise exception 'INVALID_TARGET'; end if;
  if not exists (select 1 from pg_catalog.pg_timezone_names where name = p_timezone) then raise exception 'INVALID_TIMEZONE'; end if;

  insert into public.leagues(name, timezone, consequence_rules, commissioner_id)
  values (trim(p_name), p_timezone, trim(p_consequence_rules), auth.uid()) returning * into v_league;
  insert into public.league_members(league_id, user_id, role) values (v_league.id, auth.uid(), 'commissioner');
  insert into public.user_targets(league_id, user_id, minutes, effective_from_week) values (v_league.id, auth.uid(), p_target_minutes, 1);
  insert into public.analytics_events(event_name, user_id, league_id) values ('league_created', auth.uid(), v_league.id);
  return jsonb_build_object('leagueId', v_league.id, 'inviteCode', v_league.invite_code);
end;
$$;

create or replace function public.preview_league_by_code(p_invite_code text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_league public.leagues; v_count integer;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  select * into v_league from public.leagues where invite_code = upper(trim(p_invite_code));
  if not found then raise exception 'INVALID_INVITE_CODE'; end if;
  select count(*) into v_count from public.league_members where league_id = v_league.id and status = 'active';
  return jsonb_build_object('name', v_league.name, 'timezone', v_league.timezone, 'consequenceRules', v_league.consequence_rules, 'memberCount', v_count);
end;
$$;

create or replace function public.join_league(p_invite_code text, p_target_minutes integer)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_league public.leagues; v_count integer; v_eligible integer := 1;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  if p_target_minutes not between 1 and 1440 then raise exception 'INVALID_TARGET'; end if;
  if exists (select 1 from public.league_members where user_id = auth.uid() and status = 'active') then raise exception 'ACTIVE_LEAGUE_EXISTS'; end if;
  select * into v_league from public.leagues where invite_code = upper(trim(p_invite_code)) for update;
  if not found then raise exception 'INVALID_INVITE_CODE'; end if;
  select count(*) into v_count from public.league_members where league_id = v_league.id and status = 'active';
  if v_count >= 10 then raise exception 'LEAGUE_FULL'; end if;
  select least(9, week.week_number + 1) into v_eligible
  from public.seasons season join public.weeks week on week.season_id = season.id and week.status = 'active'
  where season.league_id = v_league.id and season.status = 'active';
  v_eligible := coalesce(v_eligible, 1);
  insert into public.league_members(league_id, user_id, eligible_from_week) values (v_league.id, auth.uid(), v_eligible);
  insert into public.user_targets(league_id, user_id, minutes, effective_from_week) values (v_league.id, auth.uid(), p_target_minutes, v_eligible);
  insert into public.analytics_events(event_name, user_id, league_id) values ('league_joined', auth.uid(), v_league.id);
  return jsonb_build_object('leagueId', v_league.id);
end;
$$;

create or replace function public.start_season()
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_league_id uuid; v_season_id uuid; v_number integer; v_start date; v_count integer; v_missing integer;
begin
  v_league_id := private.current_league_id();
  if v_league_id is null or not private.is_commissioner(v_league_id) then raise exception 'COMMISSIONER_REQUIRED'; end if;
  if exists (select 1 from public.seasons where league_id = v_league_id and status = 'active') then raise exception 'ACTIVE_SEASON_EXISTS'; end if;
  select count(*) into v_count from public.league_members where league_id = v_league_id and status = 'active';
  if v_count not between 2 and 10 then raise exception 'ROSTER_MUST_HAVE_2_TO_10_MEMBERS'; end if;
  update public.league_members set eligible_from_week = 1 where league_id = v_league_id and status = 'active';
  insert into public.user_targets(league_id, user_id, minutes, effective_from_week)
  select v_league_id, member.user_id, latest.minutes, 1
  from public.league_members member
  cross join lateral (
    select minutes from public.user_targets target
    where target.league_id = v_league_id and target.user_id = member.user_id
    order by target.created_at desc, target.effective_from_week desc limit 1
  ) latest
  where member.league_id = v_league_id and member.status = 'active'
  on conflict (league_id, user_id, effective_from_week) do update set minutes = excluded.minutes, created_at = now();
  delete from public.user_targets where league_id = v_league_id and effective_from_week > 1;
  select count(*) into v_missing from public.league_members member where member.league_id = v_league_id and member.status = 'active'
    and not exists (select 1 from public.user_targets target where target.league_id = v_league_id and target.user_id = member.user_id);
  if v_missing > 0 then raise exception 'EVERY_MEMBER_NEEDS_A_TARGET'; end if;
  select coalesce(max(season_number), 0) + 1 into v_number from public.seasons where league_id = v_league_id;
  v_start := private.league_local_date(v_league_id);
  insert into public.seasons(league_id, season_number, start_date, end_date) values (v_league_id, v_number, v_start, v_start + 55) returning id into v_season_id;
  perform private.create_week(v_season_id, 1, v_start);
  insert into public.analytics_events(event_name, user_id, league_id, properties) values ('season_started', auth.uid(), v_league_id, jsonb_build_object('seasonNumber', v_number));
  return jsonb_build_object('seasonId', v_season_id);
end;
$$;

create or replace function public.set_target(p_minutes integer)
returns void language plpgsql security definer set search_path = '' as $$
declare v_league_id uuid; v_effective integer := 1;
begin
  if p_minutes not between 1 and 1440 then raise exception 'INVALID_TARGET'; end if;
  v_league_id := private.current_league_id();
  if v_league_id is null then raise exception 'ACTIVE_LEAGUE_REQUIRED'; end if;
  select least(9, week.week_number + 1) into v_effective
  from public.seasons season join public.weeks week on week.season_id = season.id and week.status = 'active'
  where season.league_id = v_league_id and season.status = 'active';
  v_effective := coalesce(v_effective, 1);
  insert into public.user_targets(league_id, user_id, minutes, effective_from_week)
  values (v_league_id, auth.uid(), p_minutes, v_effective)
  on conflict (league_id, user_id, effective_from_week) do update set minutes = excluded.minutes, created_at = now();
end;
$$;

create or replace function public.submit_screen_time_entry(
  p_local_date date,
  p_minutes integer,
  p_source public.entry_source default 'manual',
  p_evidence_reference text default null
)
returns void language plpgsql security definer set search_path = '' as $$
declare v_league_id uuid; v_week public.weeks;
begin
  if p_minutes not between 0 and 1440 then raise exception 'INVALID_MINUTES'; end if;
  v_league_id := private.current_league_id();
  if v_league_id is null then raise exception 'ACTIVE_LEAGUE_REQUIRED'; end if;
  select * into v_week from public.weeks
  where league_id = v_league_id and status = 'active' and p_local_date between start_date and end_date;
  if not found then raise exception 'DATE_IS_NOT_IN_AN_OPEN_WEEK'; end if;
  if p_local_date > private.league_local_date(v_league_id) then raise exception 'FUTURE_ENTRY_NOT_ALLOWED'; end if;
  if not exists (select 1 from public.week_participants where week_id = v_week.id and user_id = auth.uid()) then raise exception 'NOT_ELIGIBLE_THIS_WEEK'; end if;
  insert into public.screen_time_entries(week_id, league_id, user_id, local_date, minutes, source, evidence_reference)
  values (v_week.id, v_league_id, auth.uid(), p_local_date, p_minutes, p_source, nullif(trim(p_evidence_reference), ''))
  on conflict (league_id, user_id, local_date) do update set
    minutes = excluded.minutes,
    source = excluded.source,
    evidence_reference = excluded.evidence_reference,
    updated_at = now();
  insert into public.analytics_events(event_name, user_id, league_id, properties)
  values ('entry_submitted', auth.uid(), v_league_id, jsonb_build_object('localDate', p_local_date, 'minutes', p_minutes, 'source', p_source));
end;
$$;

create or replace function public.suggest_consequence(p_title text, p_description text default null)
returns void language plpgsql security definer set search_path = '' as $$
declare v_league_id uuid;
begin
  v_league_id := private.current_league_id();
  if v_league_id is null then raise exception 'ACTIVE_LEAGUE_REQUIRED'; end if;
  if char_length(trim(p_title)) not between 1 and 120 then raise exception 'INVALID_TITLE'; end if;
  insert into public.consequences(league_id, suggested_by, title, description)
  values (v_league_id, auth.uid(), trim(p_title), nullif(trim(p_description), ''));
end;
$$;

create or replace function public.moderate_consequence(p_consequence_id uuid, p_status public.consequence_status)
returns void language plpgsql security definer set search_path = '' as $$
declare v_league_id uuid;
begin
  v_league_id := private.current_league_id();
  if v_league_id is null or not private.is_commissioner(v_league_id) then raise exception 'COMMISSIONER_REQUIRED'; end if;
  if p_status not in ('approved', 'retired') then raise exception 'INVALID_STATUS'; end if;
  update public.consequences set status = p_status, approved_by = case when p_status = 'approved' then auth.uid() else approved_by end
  where id = p_consequence_id and league_id = v_league_id;
  if not found then raise exception 'CONSEQUENCE_NOT_FOUND'; end if;
  if p_status = 'retired' then
    update public.leagues set next_consequence_id = null where id = v_league_id and next_consequence_id = p_consequence_id;
  end if;
end;
$$;

create or replace function public.select_next_consequence(p_consequence_id uuid default null)
returns void language plpgsql security definer set search_path = '' as $$
declare v_league_id uuid;
begin
  v_league_id := private.current_league_id();
  if v_league_id is null or not private.is_commissioner(v_league_id) then raise exception 'COMMISSIONER_REQUIRED'; end if;
  if p_consequence_id is not null and not exists (select 1 from public.consequences where id = p_consequence_id and league_id = v_league_id and status = 'approved') then raise exception 'APPROVED_CONSEQUENCE_REQUIRED'; end if;
  update public.leagues set next_consequence_id = p_consequence_id where id = v_league_id;
end;
$$;

create or replace function public.mark_consequence_done(p_weekly_result_id uuid, p_done boolean default true)
returns void language plpgsql security definer set search_path = '' as $$
begin
  update public.weekly_results set consequence_done = p_done
  where id = p_weekly_result_id and user_id = auth.uid() and assigned_consequence_id is not null;
  if not found then raise exception 'ASSIGNED_CONSEQUENCE_NOT_FOUND'; end if;
end;
$$;

create or replace function public.track_analytics_event(p_event_name text, p_properties jsonb default '{}'::jsonb)
returns void language plpgsql security definer set search_path = '' as $$
declare v_league_id uuid;
begin
  if p_event_name <> 'recap_viewed' then raise exception 'CLIENT_EVENT_NOT_ALLOWED'; end if;
  v_league_id := private.current_league_id();
  insert into public.analytics_events(event_name, user_id, league_id, properties) values (p_event_name, auth.uid(), v_league_id, coalesce(p_properties, '{}'::jsonb));
end;
$$;

revoke all on function public.update_profile(text, text) from public, anon;
revoke all on function public.create_league(text, text, text, integer) from public, anon;
revoke all on function public.preview_league_by_code(text) from public, anon;
revoke all on function public.join_league(text, integer) from public, anon;
revoke all on function public.start_season() from public, anon;
revoke all on function public.set_target(integer) from public, anon;
revoke all on function public.submit_screen_time_entry(date, integer, public.entry_source, text) from public, anon;
revoke all on function public.suggest_consequence(text, text) from public, anon;
revoke all on function public.moderate_consequence(uuid, public.consequence_status) from public, anon;
revoke all on function public.select_next_consequence(uuid) from public, anon;
revoke all on function public.mark_consequence_done(uuid, boolean) from public, anon;
revoke all on function public.track_analytics_event(text, jsonb) from public, anon;

grant execute on function public.update_profile(text, text) to authenticated;
grant execute on function public.create_league(text, text, text, integer) to authenticated;
grant execute on function public.preview_league_by_code(text) to authenticated;
grant execute on function public.join_league(text, integer) to authenticated;
grant execute on function public.start_season() to authenticated;
grant execute on function public.set_target(integer) to authenticated;
grant execute on function public.submit_screen_time_entry(date, integer, public.entry_source, text) to authenticated;
grant execute on function public.suggest_consequence(text, text) to authenticated;
grant execute on function public.moderate_consequence(uuid, public.consequence_status) to authenticated;
grant execute on function public.select_next_consequence(uuid) to authenticated;
grant execute on function public.mark_consequence_done(uuid, boolean) to authenticated;
grant execute on function public.track_analytics_event(text, jsonb) to authenticated;

commit;
