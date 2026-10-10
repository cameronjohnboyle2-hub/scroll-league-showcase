-- Local-only accounts. Every password is: Password123!
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, email_change, email_change_token_new, recovery_token
)
values
  ('00000000-0000-0000-0000-000000000000','10000000-0000-4000-8000-000000000001','authenticated','authenticated','demo-atlas@example.test',extensions.crypt('Password123!', extensions.gen_salt('bf')),now(),'{"provider":"email","providers":["email"]}','{"display_name":"Demo Atlas"}',now(),now(),'','','',''),
  ('00000000-0000-0000-0000-000000000000','10000000-0000-4000-8000-000000000002','authenticated','authenticated','demo-birch@example.test',extensions.crypt('Password123!', extensions.gen_salt('bf')),now(),'{"provider":"email","providers":["email"]}','{"display_name":"Demo Birch"}',now(),now(),'','','',''),
  ('00000000-0000-0000-0000-000000000000','10000000-0000-4000-8000-000000000003','authenticated','authenticated','demo-cedar@example.test',extensions.crypt('Password123!', extensions.gen_salt('bf')),now(),'{"provider":"email","providers":["email"]}','{"display_name":"Demo Cedar"}',now(),now(),'','','',''),
  ('00000000-0000-0000-0000-000000000000','10000000-0000-4000-8000-000000000004','authenticated','authenticated','demo-dune@example.test',extensions.crypt('Password123!', extensions.gen_salt('bf')),now(),'{"provider":"email","providers":["email"]}','{"display_name":"Demo Dune"}',now(),now(),'','','',''),
  ('00000000-0000-0000-0000-000000000000','10000000-0000-4000-8000-000000000005','authenticated','authenticated','demo-elm@example.test',extensions.crypt('Password123!', extensions.gen_salt('bf')),now(),'{"provider":"email","providers":["email"]}','{"display_name":"Demo Elm"}',now(),now(),'','','',''),
  ('00000000-0000-0000-0000-000000000000','20000000-0000-4000-8000-000000000001','authenticated','authenticated','demo-flint@example.test',extensions.crypt('Password123!', extensions.gen_salt('bf')),now(),'{"provider":"email","providers":["email"]}','{"display_name":"Demo Flint"}',now(),now(),'','','',''),
  ('00000000-0000-0000-0000-000000000000','20000000-0000-4000-8000-000000000002','authenticated','authenticated','demo-grove@example.test',extensions.crypt('Password123!', extensions.gen_salt('bf')),now(),'{"provider":"email","providers":["email"]}','{"display_name":"Demo Grove"}',now(),now(),'','','','')
on conflict (id) do nothing;

insert into auth.identities(id, provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
select gen_random_uuid(), user_row.id::text, user_row.id,
  jsonb_build_object('sub', user_row.id::text, 'email', user_row.email, 'email_verified', true),
  'email', now(), now(), now()
from auth.users user_row
where user_row.email like '%@example.test'
on conflict (provider_id, provider) do nothing;

insert into public.profiles(id, display_name)
values
  ('10000000-0000-4000-8000-000000000001','Demo Atlas'),
  ('10000000-0000-4000-8000-000000000002','Demo Birch'),
  ('10000000-0000-4000-8000-000000000003','Demo Cedar'),
  ('10000000-0000-4000-8000-000000000004','Demo Dune'),
  ('10000000-0000-4000-8000-000000000005','Demo Elm'),
  ('20000000-0000-4000-8000-000000000001','Demo Flint'),
  ('20000000-0000-4000-8000-000000000002','Demo Grove')
on conflict (id) do update set display_name = excluded.display_name;

insert into public.leagues(id, name, timezone, consequence_rules, commissioner_id, invite_code)
values
  ('30000000-0000-4000-8000-000000000001','Daybreak Demo','America/Denver','Keep it funny, cheap, safe, and finishable in one week. No humiliation, money, or coercion.','10000000-0000-4000-8000-000000000001','DEMO2026'),
  ('30000000-0000-4000-8000-000000000002','Isolation Test','America/New_York','No money, danger, humiliation, or enforcement.','20000000-0000-4000-8000-000000000001','OTHER26')
on conflict (id) do nothing;

insert into public.league_members(league_id, user_id, role)
values
  ('30000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','commissioner'),
  ('30000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000002','member'),
  ('30000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000003','member'),
  ('30000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000004','member'),
  ('30000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000005','member'),
  ('30000000-0000-4000-8000-000000000002','20000000-0000-4000-8000-000000000001','commissioner'),
  ('30000000-0000-4000-8000-000000000002','20000000-0000-4000-8000-000000000002','member')
on conflict (league_id, user_id) do nothing;

insert into public.user_targets(league_id, user_id, minutes, effective_from_week)
values
  ('30000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001',120,1),
  ('30000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000002',105,1),
  ('30000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000003',90,1),
  ('30000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000004',135,1),
  ('30000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000005',110,1),
  ('30000000-0000-4000-8000-000000000002','20000000-0000-4000-8000-000000000001',100,1),
  ('30000000-0000-4000-8000-000000000002','20000000-0000-4000-8000-000000000002',100,1)
on conflict (league_id, user_id, effective_from_week) do update set minutes = excluded.minutes;

insert into public.consequences(league_id, suggested_by, title, description, status, approved_by)
values
  ('30000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000002','Use a flip-phone wallpaper for a week','Honor system. No purchase required.','approved','10000000-0000-4000-8000-000000000001'),
  ('30000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000003','Voice-note an apology to your thumbs',null,'approved','10000000-0000-4000-8000-000000000001');
