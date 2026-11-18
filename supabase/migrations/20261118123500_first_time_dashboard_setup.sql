alter table public.profiles
  add column dashboard_sources text[] not null default array[
    'canvas',
    'google_drive',
    'google_calendar',
    'outlook_mail',
    'outlook_calendar',
    'onedrive',
    'onenote',
    'uploads'
  ],
  add column onboarding_version integer not null default 0
    check (onboarding_version >= 0);

update public.profiles
set onboarding_version = 1
where onboarding_completed;
