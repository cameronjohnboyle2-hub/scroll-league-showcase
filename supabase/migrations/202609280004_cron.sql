begin;

create extension if not exists pg_cron;

select cron.schedule(
  'scroll-league-finalize-due-weeks',
  '*/15 * * * *',
  $$ select public.finalize_due_weeks(); $$
);

commit;
