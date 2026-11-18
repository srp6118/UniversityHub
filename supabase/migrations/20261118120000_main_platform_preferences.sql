alter table public.profiles
  add column main_platform text
    check (main_platform in ('canvas', 'minerva', 'blackboard', 'teams')),
  add column platform_urls jsonb not null default '{}'::jsonb
    check (jsonb_typeof(platform_urls) = 'object'),
  add column onboarding_completed boolean not null default false;
