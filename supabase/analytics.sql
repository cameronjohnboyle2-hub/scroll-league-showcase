-- Active league week: at least half of the snapshotted roster each submitted on four or more distinct days.
with member_days as (
  select week.id as week_id, week.league_id, participant.user_id, count(distinct entry.local_date) as submitted_days
  from public.weeks week
  join public.week_participants participant on participant.week_id = week.id
  left join public.screen_time_entries entry on entry.week_id = week.id and entry.user_id = participant.user_id
  group by week.id, week.league_id, participant.user_id
), week_activity as (
  select week_id, league_id, count(*) as roster_size, count(*) filter (where submitted_days >= 4) as participating_members
  from member_days group by week_id, league_id
)
select *, participating_members >= ceil(roster_size / 2.0) as is_active_league_week from week_activity;

-- League retention at weeks 1, 2, 4, and 8.
with active as (
  select week.season_id, week.week_number, week.league_id,
    count(*) as roster_size,
    count(*) filter (where entry_days.days >= 4) as participating_members
  from public.weeks week
  join public.week_participants participant on participant.week_id = week.id
  left join (
    select week_id, user_id, count(distinct local_date) as days from public.screen_time_entries group by week_id, user_id
  ) entry_days on entry_days.week_id = week.id and entry_days.user_id = participant.user_id
  where week.week_number in (1, 2, 4, 8)
  group by week.season_id, week.week_number, week.league_id
)
select week_number, count(*) as leagues_reached, count(*) filter (where participating_members >= ceil(roster_size / 2.0)) as active_leagues
from active group by week_number order by week_number;

-- Member participation by week.
select week.league_id, week.season_id, week.week_number, participant.user_id,
  count(distinct entry.local_date) as days_reported,
  count(entry.id) as entries
from public.weeks week
join public.week_participants participant on participant.week_id = week.id
left join public.screen_time_entries entry on entry.week_id = week.id and entry.user_id = participant.user_id
group by week.league_id, week.season_id, week.week_number, participant.user_id;

-- Entries per user.
select league_id, user_id, count(*) as entries, count(distinct local_date) as distinct_days
from public.screen_time_entries group by league_id, user_id order by entries desc;

-- Recap views.
select league_id, properties ->> 'weekId' as week_id, count(*) as views, count(distinct user_id) as unique_viewers
from public.analytics_events where event_name = 'recap_viewed'
group by league_id, properties ->> 'weekId';

-- Season restarts.
select league_id, greatest(count(*) - 1, 0) as season_restarts, max(season_number) as latest_season
from public.seasons group by league_id;
