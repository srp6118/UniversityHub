create table public.oauth_states (
  state text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  provider text not null check (provider in ('google', 'microsoft', 'canvas')),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);

create index oauth_states_expires_at_idx on public.oauth_states (expires_at);

create table public.oauth_tokens (
  user_id uuid not null references auth.users (id) on delete cascade,
  provider text not null check (provider in ('google', 'microsoft', 'canvas')),
  encrypted_payload text not null,
  scopes text[] not null default '{}',
  expires_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (user_id, provider)
);

alter table public.oauth_states enable row level security;
alter table public.oauth_tokens enable row level security;

revoke all on public.oauth_states from public, anon, authenticated;
revoke all on public.oauth_tokens from public, anon, authenticated;
grant all on public.oauth_states to service_role;
grant all on public.oauth_tokens to service_role;

create unique index workspace_records_sync_identity_idx
  on public.workspace_records (user_id, provider, external_id)
  where external_id is not null;
