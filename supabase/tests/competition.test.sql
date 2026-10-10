begin;
create extension if not exists pgtap with schema extensions;
select plan(20);

select is(private.daily_score(120, 120), 100, 'meeting target scores 100');
select is(private.daily_score(120, 60), 150, 'half target scores 150');
select is(private.daily_score(120, 240), 0, 'double target scores 0');
select is(private.daily_score(120, 0), 150, 'reported zero minutes scores 150');

update public.leagues set next_consequence_id = (
  select id from public.consequences where league_id = '30000000-0000-4000-8000-000000000001' order by created_at limit 1
) where id = '30000000-0000-4000-8000-000000000001';

select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
set local role authenticated;

select ok((public.start_season() ->> 'seasonId') is not null, 'commissioner starts season');
select lives_ok($$ select public.set_target(60) $$, 'target change queues without changing current snapshot');

reset role;

select is((select count(*)::integer from public.week_participants participant join public.weeks week on week.id = participant.week_id where week.week_number = 1 and week.league_id = '30000000-0000-4000-8000-000000000001'), 5, 'five members participate');
select is((select count(*)::integer from public.matchups matchup join public.weeks week on week.id = matchup.week_id where week.week_number = 1 and week.league_id = '30000000-0000-4000-8000-000000000001'), 3, 'five members create two matchups and one bye row');
select is((select count(*)::integer from public.week_participants participant join public.weeks week on week.id = participant.week_id where week.week_number = 1 and participant.has_bye), 1, 'exactly one week-one bye');

update public.weeks set start_date = current_date - 8, end_date = current_date - 2
where league_id = '30000000-0000-4000-8000-000000000001' and week_number = 1;
select private.finalize_week((select id from public.weeks where league_id = '30000000-0000-4000-8000-000000000001' and week_number = 1));

select is((select count(*)::integer from public.weekly_results result join public.weeks week on week.id = result.week_id where week.week_number = 1 and week.league_id = '30000000-0000-4000-8000-000000000001'), 5, 'finalizer saves one result per member');
select is((select count(*)::integer from public.weekly_results result join public.weeks week on week.id = result.week_id where week.week_number = 1 and result.unreported_days = 7), 5, 'missing days remain unreported and score zero');
select is((select count(*)::integer from public.matchups matchup join public.weeks week on week.id = matchup.week_id where week.week_number = 1 and matchup.is_tie), 2, 'exact head-to-head ties are recorded');
select is((select count(*)::integer from public.weekly_results result join public.weeks week on week.id = result.week_id where week.week_number = 1 and result.assigned_consequence_id is not null), 0, 'exact overall-last tie assigns no consequence');
select is((select target_minutes_snapshot from public.week_participants participant join public.weeks week on week.id = participant.week_id where week.week_number = 2 and participant.user_id = '10000000-0000-4000-8000-000000000001'), 60, 'target change appears in next weekly snapshot');
select isnt(
  (select participant.user_id from public.week_participants participant join public.weeks week on week.id = participant.week_id where week.week_number = 1 and participant.has_bye),
  (select participant.user_id from public.week_participants participant join public.weeks week on week.id = participant.week_id where week.week_number = 2 and participant.has_bye),
  'bye rotates in week two'
);

update public.weeks set consequence_id = (
  select id from public.consequences where league_id = '30000000-0000-4000-8000-000000000001' order by created_at limit 1
)
where league_id = '30000000-0000-4000-8000-000000000001' and week_number = 2;

insert into public.screen_time_entries(week_id, league_id, user_id, local_date, minutes, source)
select week.id, week.league_id, participant.user_id, day::date, 0, 'manual'
from public.weeks week
join public.week_participants participant on participant.week_id = week.id and not participant.has_bye
cross join lateral generate_series(week.start_date, week.end_date, interval '1 day') day
where week.league_id = '30000000-0000-4000-8000-000000000001' and week.week_number = 2;

select private.finalize_week((select id from public.weeks where league_id = '30000000-0000-4000-8000-000000000001' and week_number = 2));
select is((
  select count(*)::integer from public.weekly_results result
  join public.week_participants participant on participant.week_id = result.week_id and participant.user_id = result.user_id
  join public.weeks week on week.id = result.week_id
  where week.league_id = '30000000-0000-4000-8000-000000000001' and week.week_number = 2
    and participant.has_bye and result.assigned_consequence_id is not null
), 1, 'a bye member remains eligible for the overall last-place consequence');
select is((
  select count(*)::integer from public.weekly_results result
  join public.week_participants participant on participant.week_id = result.week_id and participant.user_id = result.user_id
  join public.weeks week on week.id = result.week_id
  where week.league_id = '30000000-0000-4000-8000-000000000001' and week.week_number = 2
    and not participant.has_bye and result.unreported_days = 0 and result.displayed_score = 150
), 4, 'reported zero-minute days are not missing and score 150');
select is((
  select count(*)::integer from public.weekly_results result
  join public.week_participants participant on participant.week_id = result.week_id and participant.user_id = result.user_id
  join public.weeks week on week.id = result.week_id
  where week.league_id = '30000000-0000-4000-8000-000000000001' and week.week_number = 2
    and participant.has_bye and result.outcome = 'bye' and result.displayed_score = 0
), 1, 'the bye records no win or loss while retaining its score');

select private.finalize_week((select id from public.weeks where league_id = '30000000-0000-4000-8000-000000000001' and week_number = 1));
select is((select count(*)::integer from public.weeks where league_id = '30000000-0000-4000-8000-000000000001' and week_number = 2), 1, 'repeat finalization creates no duplicate week');

select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
set local role authenticated;
select is((select count(*)::integer from public.leagues where id = '30000000-0000-4000-8000-000000000002'), 0, 'RLS hides another league');
reset role;

select * from finish();
rollback;
