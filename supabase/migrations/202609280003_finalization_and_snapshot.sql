begin;

create or replace function private.finalize_week(p_week_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_week public.weeks;
  v_min_score numeric;
  v_last_count integer;
  v_last_result_id uuid;
  v_champion jsonb;
  v_last_place jsonb;
  v_best_day jsonb;
  v_closest jsonb;
  v_next_week_id uuid;
begin
  select * into v_week from public.weeks where id = p_week_id for update;
  if not found then raise exception 'WEEK_NOT_FOUND'; end if;
  if v_week.status = 'finalized' then return; end if;

  insert into public.weekly_results(
    week_id, league_id, user_id, matchup_id, outcome, displayed_score,
    rounded_daily_average, unrounded_score, unreported_days
  )
  select
    participant.week_id,
    participant.league_id,
    participant.user_id,
    matchup.id,
    (case when participant.has_bye then 'bye' else 'loss' end)::public.result_outcome,
    round(avg(case when entry.id is null then 0 else private.daily_score(participant.target_minutes_snapshot, entry.minutes) end))::integer,
    avg(case when entry.id is null then 0 else private.daily_score(participant.target_minutes_snapshot, entry.minutes) end)::numeric(8,3),
    avg(case when entry.id is null then 0 else private.daily_unrounded_score(participant.target_minutes_snapshot, entry.minutes) end)::numeric(12,6),
    count(*) filter (where entry.id is null)::integer
  from public.week_participants participant
  join public.weeks week on week.id = participant.week_id
  cross join lateral generate_series(week.start_date, week.end_date, interval '1 day') day
  left join public.screen_time_entries entry on entry.week_id = participant.week_id and entry.user_id = participant.user_id and entry.local_date = day::date
  left join public.matchups matchup on matchup.week_id = participant.week_id and (matchup.member_a_id = participant.user_id or matchup.member_b_id = participant.user_id)
  where participant.week_id = p_week_id
  group by participant.week_id, participant.league_id, participant.user_id, participant.has_bye, matchup.id
  on conflict (week_id, user_id) do nothing;

  with scores as (
    select matchup.id,
      result_a.rounded_daily_average as a_score,
      result_b.rounded_daily_average as b_score,
      result_a.displayed_score as a_displayed,
      result_b.displayed_score as b_displayed,
      result_a.unrounded_score as a_unrounded,
      result_b.unrounded_score as b_unrounded,
      matchup.member_a_id,
      matchup.member_b_id
    from public.matchups matchup
    join public.weekly_results result_a on result_a.week_id = matchup.week_id and result_a.user_id = matchup.member_a_id
    left join public.weekly_results result_b on result_b.week_id = matchup.week_id and result_b.user_id = matchup.member_b_id
    where matchup.week_id = p_week_id
  )
  update public.matchups matchup set
    member_a_score = scores.a_score,
    member_b_score = scores.b_score,
    member_a_unrounded_score = scores.a_unrounded,
    member_b_unrounded_score = scores.b_unrounded,
    winner_id = case
      when scores.member_b_id is null then null
      when scores.a_displayed <> scores.b_displayed then case when scores.a_displayed > scores.b_displayed then scores.member_a_id else scores.member_b_id end
      when abs(scores.a_unrounded - scores.b_unrounded) < 0.000001 then null
      when scores.a_unrounded > scores.b_unrounded then scores.member_a_id else scores.member_b_id
    end,
    is_tie = case when scores.member_b_id is null then false else scores.a_displayed = scores.b_displayed and abs(scores.a_unrounded - scores.b_unrounded) < 0.000001 end,
    status = 'final',
    finalized_at = now()
  from scores where matchup.id = scores.id;

  update public.weekly_results result set
    outcome = case
      when participant.has_bye then 'bye'::public.result_outcome
      when matchup.is_tie then 'tie'::public.result_outcome
      when matchup.winner_id = result.user_id then 'win'::public.result_outcome
      else 'loss'::public.result_outcome
    end
  from public.week_participants participant, public.matchups matchup
  where result.week_id = p_week_id
    and participant.week_id = result.week_id and participant.user_id = result.user_id
    and matchup.week_id = result.week_id and (matchup.member_a_id = result.user_id or matchup.member_b_id = result.user_id);

  select min(rounded_daily_average) into v_min_score from public.weekly_results where week_id = p_week_id;
  select count(*) into v_last_count
  from public.weekly_results where week_id = p_week_id and rounded_daily_average = v_min_score;
  if v_last_count = 1 then
    select id into v_last_result_id
    from public.weekly_results where week_id = p_week_id and rounded_daily_average = v_min_score;
  end if;
  if v_last_count = 1 and v_week.consequence_id is not null then
    update public.weekly_results set assigned_consequence_id = v_week.consequence_id where id = v_last_result_id;
  end if;

  select jsonb_build_object('userId', result.user_id, 'displayName', profile.display_name, 'score', result.displayed_score)
  into v_champion
  from public.weekly_results result join public.profiles profile on profile.id = result.user_id
  where result.week_id = p_week_id
  order by result.displayed_score desc, result.unrounded_score desc, result.user_id limit 1;

  if v_last_count = 1 then
    select jsonb_build_object(
      'userId', result.user_id,
      'displayName', profile.display_name,
      'score', result.displayed_score,
      'consequence', consequence.title
    ) into v_last_place
    from public.weekly_results result
    join public.profiles profile on profile.id = result.user_id
    left join public.consequences consequence on consequence.id = result.assigned_consequence_id
    where result.id = v_last_result_id;
  else
    v_last_place := null;
  end if;

  select jsonb_build_object(
    'userId', entry.user_id,
    'displayName', profile.display_name,
    'localDate', entry.local_date,
    'score', private.daily_score(participant.target_minutes_snapshot, entry.minutes)
  ) into v_best_day
  from public.screen_time_entries entry
  join public.week_participants participant on participant.week_id = entry.week_id and participant.user_id = entry.user_id
  join public.profiles profile on profile.id = entry.user_id
  where entry.week_id = p_week_id
  order by private.daily_unrounded_score(participant.target_minutes_snapshot, entry.minutes) desc, entry.user_id, entry.local_date limit 1;

  select jsonb_build_object('matchupId', id, 'margin', abs(member_a_score - member_b_score)) into v_closest
  from public.matchups where week_id = p_week_id and member_b_id is not null
  order by abs(member_a_score - member_b_score), id limit 1;

  update public.weeks set
    status = 'finalized',
    finalized_at = now(),
    recap = jsonb_build_object(
      'version', 1,
      'weekNumber', v_week.week_number,
      'headline', case when v_champion is null then 'The week is in the books.' else (v_champion ->> 'displayName') || ' won the scroll battle.' end,
      'champion', v_champion,
      'closestMatchup', v_closest,
      'bestDay', v_best_day,
      'lastPlace', v_last_place,
      'lines', jsonb_build_array(
        case when v_closest is null then 'No head-to-head result this week.' else 'Closest matchup: ' || round((v_closest ->> 'margin')::numeric)::text || ' points.' end,
        case when v_best_day is null then 'Nobody reported a day.' else (v_best_day ->> 'displayName') || ' posted the week''s best day.' end,
        case when v_last_count > 1 then 'Last place was an exact tie, so the consequence is off.' when v_week.consequence_id is null then 'No stake was selected.' else coalesce(v_last_place ->> 'consequence', 'The selected consequence applies.') end
      )
    )
  where id = p_week_id;

  insert into public.analytics_events(event_name, league_id, properties)
  values ('week_finalized', v_week.league_id, jsonb_build_object('weekNumber', v_week.week_number, 'seasonId', v_week.season_id));

  if v_week.week_number < 8 then
    v_next_week_id := private.create_week(v_week.season_id, v_week.week_number + 1, v_week.end_date + 1);
  else
    update public.seasons set status = 'completed', completed_at = now() where id = v_week.season_id;
  end if;
end;
$$;

create or replace function public.finalize_due_weeks()
returns integer language plpgsql security definer set search_path = '' as $$
declare v_week record; v_count integer := 0;
begin
  for v_week in
    select week.id
    from public.weeks week join public.leagues league on league.id = week.league_id
    where week.status = 'active' and week.end_date < (now() at time zone league.timezone)::date
    order by week.end_date, week.id
    for update of week skip locked
  loop
    perform private.finalize_week(v_week.id);
    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$;

create or replace function public.get_app_snapshot()
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_league_id uuid;
  v_league public.leagues;
  v_profile public.profiles;
  v_season public.seasons;
  v_week public.weeks;
  v_profile_json jsonb;
  v_league_json jsonb;
  v_season_json jsonb;
  v_week_json jsonb;
  v_members jsonb := '[]'::jsonb;
  v_standings jsonb := '[]'::jsonb;
  v_weeks jsonb := '[]'::jsonb;
  v_participants jsonb := '[]'::jsonb;
  v_entries jsonb := '[]'::jsonb;
  v_matchups jsonb := '[]'::jsonb;
  v_consequences jsonb := '[]'::jsonb;
  v_results jsonb := '[]'::jsonb;
  v_activity jsonb := '[]'::jsonb;
  v_effective_week integer := 8;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  v_league_id := private.current_league_id();
  if v_league_id is null then raise exception 'NO_ACTIVE_LEAGUE'; end if;
  select * into strict v_profile from public.profiles where id = auth.uid();
  select * into strict v_league from public.leagues where id = v_league_id;
  select * into v_season from public.seasons where league_id = v_league_id order by (status = 'active') desc, season_number desc limit 1;
  if found then
    select * into v_week from public.weeks where season_id = v_season.id order by (status = 'active') desc, week_number desc limit 1;
    v_effective_week := coalesce(v_week.week_number, 8);
    v_season_json := jsonb_build_object('id', v_season.id, 'number', v_season.season_number, 'status', v_season.status);
  else
    v_season_json := null;
  end if;

  v_profile_json := jsonb_build_object('id', v_profile.id, 'displayName', v_profile.display_name, 'avatarUrl', v_profile.avatar_url);
  v_league_json := jsonb_build_object(
    'id', v_league.id,
    'name', v_league.name,
    'timezone', v_league.timezone,
    'commissionerId', v_league.commissioner_id,
    'consequenceRules', v_league.consequence_rules,
    'inviteCode', v_league.invite_code
  );

  with stats as (
    select
      member.user_id,
      count(*) filter (where result.outcome <> 'bye')::integer as games,
      count(*) filter (where result.outcome = 'win')::integer as wins,
      count(*) filter (where result.outcome = 'loss')::integer as losses,
      count(*) filter (where result.outcome = 'tie')::integer as ties,
      coalesce(sum(result.rounded_daily_average), 0)::numeric as total_score,
      coalesce(sum(result.unreported_days), 0)::integer as unreported_days
    from public.league_members member
    left join public.weekly_results result on result.league_id = member.league_id and result.user_id = member.user_id
      and (v_season.id is null or result.week_id in (select id from public.weeks where season_id = v_season.id))
    where member.league_id = v_league_id and member.status = 'active'
    group by member.user_id
  ), ranked as (
    select stats.*,
      coalesce((wins + ties * 0.5) / nullif(games, 0), 0)::numeric as win_percentage,
      row_number() over (order by coalesce((wins + ties * 0.5) / nullif(games, 0), 0) desc, total_score desc, unreported_days, user_id)::integer as rank
    from stats
  ), rows as (
    select ranked.*, profile.display_name, profile.avatar_url, member.role, member.eligible_from_week,
      coalesce((select target.minutes from public.user_targets target where target.league_id = v_league_id and target.user_id = ranked.user_id and target.effective_from_week <= v_effective_week order by target.effective_from_week desc, target.created_at desc limit 1), 120) as target_minutes,
      (select target.minutes from public.user_targets target where target.league_id = v_league_id and target.user_id = ranked.user_id and target.effective_from_week > v_effective_week order by target.effective_from_week, target.created_at desc limit 1) as next_target_minutes
    from ranked join public.profiles profile on profile.id = ranked.user_id
    join public.league_members member on member.league_id = v_league_id and member.user_id = ranked.user_id
  )
  select
    coalesce(jsonb_agg(jsonb_build_object(
      'id', user_id, 'displayName', display_name, 'avatarUrl', avatar_url, 'targetMinutes', target_minutes,
      'nextTargetMinutes', next_target_minutes,
      'eligibleFromWeek', eligible_from_week,
      'record', wins::text || '-' || losses::text || case when ties > 0 then '-' || ties::text else '' end,
      'rank', rank, 'score', total_score, 'unreportedDays', unreported_days, 'isCommissioner', role = 'commissioner'
    ) order by rank), '[]'::jsonb),
    coalesce(jsonb_agg(jsonb_build_object(
      'userId', user_id, 'wins', wins, 'losses', losses, 'ties', ties, 'games', games,
      'winPercentage', win_percentage, 'totalScore', total_score, 'unreportedDays', unreported_days, 'rank', rank
    ) order by rank), '[]'::jsonb)
  into v_members, v_standings from rows;

  if v_season.id is not null then
    select coalesce(jsonb_agg(jsonb_build_object(
      'id', week.id, 'number', week.week_number, 'startDate', week.start_date, 'endDate', week.end_date, 'status', week.status,
      'stake', case when consequence.id is null then null else jsonb_build_object('id', consequence.id, 'title', consequence.title, 'description', consequence.description, 'status', consequence.status) end,
      'recap', week.recap
    ) order by week.week_number), '[]'::jsonb)
    into v_weeks from public.weeks week left join public.consequences consequence on consequence.id = week.consequence_id where week.season_id = v_season.id;

    select coalesce(jsonb_agg(jsonb_build_object(
      'weekId', participant.week_id, 'userId', participant.user_id,
      'targetMinutes', participant.target_minutes_snapshot, 'hasBye', participant.has_bye
    ) order by week.week_number, participant.user_id), '[]'::jsonb)
    into v_participants from public.week_participants participant join public.weeks week on week.id = participant.week_id where week.season_id = v_season.id;

    select jsonb_build_object(
      'id', week.id, 'number', week.week_number, 'startDate', week.start_date, 'endDate', week.end_date, 'status', week.status,
      'stake', case when consequence.id is null then null else jsonb_build_object('id', consequence.id, 'title', consequence.title, 'description', consequence.description, 'status', consequence.status, 'selected', true) end,
      'recap', week.recap
    ) into v_week_json from public.weeks week left join public.consequences consequence on consequence.id = week.consequence_id where week.id = v_week.id;

    select coalesce(jsonb_agg(jsonb_build_object(
      'id', entry.id, 'userId', entry.user_id, 'localDate', entry.local_date, 'minutes', entry.minutes,
      'source', entry.source, 'evidenceRef', entry.evidence_reference
    ) order by entry.local_date, entry.user_id), '[]'::jsonb)
    into v_entries from public.screen_time_entries entry join public.weeks week on week.id = entry.week_id where week.season_id = v_season.id;

    select coalesce(jsonb_agg(jsonb_build_object(
      'id', matchup.id, 'weekNumber', week.week_number, 'memberAId', matchup.member_a_id, 'memberBId', matchup.member_b_id,
      'memberAScore', matchup.member_a_score, 'memberBScore', matchup.member_b_score, 'winnerId', matchup.winner_id,
      'isTie', matchup.is_tie, 'status', matchup.status
    ) order by week.week_number, matchup.id), '[]'::jsonb)
    into v_matchups from public.matchups matchup join public.weeks week on week.id = matchup.week_id where week.season_id = v_season.id;

    select coalesce(jsonb_agg(jsonb_build_object(
      'id', result.id, 'weekId', result.week_id, 'userId', result.user_id, 'outcome', result.outcome,
      'displayedScore', result.displayed_score, 'unreportedDays', result.unreported_days,
      'assignedConsequence', case when consequence.id is null then null else jsonb_build_object('id', consequence.id, 'title', consequence.title, 'description', consequence.description, 'status', consequence.status) end,
      'consequenceDone', result.consequence_done
    ) order by week.week_number, result.user_id), '[]'::jsonb)
    into v_results from public.weekly_results result join public.weeks week on week.id = result.week_id
    left join public.consequences consequence on consequence.id = result.assigned_consequence_id
    where week.season_id = v_season.id;
  else
    v_week_json := null;
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', consequence.id, 'title', consequence.title, 'description', consequence.description, 'status', consequence.status,
    'selected', consequence.id = v_league.next_consequence_id
  ) order by consequence.created_at desc), '[]'::jsonb)
  into v_consequences from public.consequences consequence where consequence.league_id = v_league_id and consequence.status <> 'retired';

  select coalesce(jsonb_agg(jsonb_build_object('id', id, 'type', type, 'text', text, 'createdAt', created_at) order by created_at desc), '[]'::jsonb)
  into v_activity from (
    select entry.id::text as id, 'entry'::text as type,
      profile.display_name || ' logged ' || entry.minutes::text || ' min' as text, entry.updated_at as created_at
    from public.screen_time_entries entry join public.profiles profile on profile.id = entry.user_id
    where entry.league_id = v_league_id
    union all
    select result.id::text, 'result', profile.display_name || ' won Week ' || week.week_number::text, result.finalized_at
    from public.weekly_results result join public.profiles profile on profile.id = result.user_id join public.weeks week on week.id = result.week_id
    where result.league_id = v_league_id and result.outcome = 'win'
    order by created_at desc limit 20
  ) activity;

  return jsonb_build_object(
    'profile', v_profile_json,
    'league', v_league_json,
    'members', v_members,
    'season', v_season_json,
    'currentWeek', v_week_json,
    'weeks', v_weeks,
    'weekParticipants', v_participants,
    'entries', v_entries,
    'matchups', v_matchups,
    'consequences', v_consequences,
    'weeklyResults', v_results,
    'activity', v_activity,
    'standings', v_standings
  );
end;
$$;

revoke all on function private.current_league_id(uuid) from public, anon, authenticated;
revoke all on function private.league_local_date(uuid) from public, anon, authenticated;
revoke all on function private.daily_score(integer, integer) from public, anon, authenticated;
revoke all on function private.daily_unrounded_score(integer, integer) from public, anon, authenticated;
revoke all on function private.create_week(uuid, integer, date) from public, anon, authenticated;
revoke all on function private.finalize_week(uuid) from public, anon, authenticated;
revoke all on function public.finalize_due_weeks() from public, anon, authenticated;
revoke all on function public.get_app_snapshot() from public, anon;
grant execute on function public.get_app_snapshot() to authenticated;

commit;
