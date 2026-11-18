create table public.user_presence (
  user_id uuid primary key references auth.users (id) on delete cascade,
  last_seen_at timestamptz not null default now()
);

alter table public.user_presence enable row level security;
revoke all on public.user_presence from public, anon, authenticated;
grant all on public.user_presence to service_role;
