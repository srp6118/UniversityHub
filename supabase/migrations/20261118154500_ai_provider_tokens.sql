create table public.ai_provider_tokens (
  user_id uuid not null references auth.users (id) on delete cascade,
  provider text not null check (provider in ('openai', 'anthropic')),
  encrypted_payload text not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, provider)
);

alter table public.ai_provider_tokens enable row level security;
revoke all on public.ai_provider_tokens from public, anon, authenticated;
grant all on public.ai_provider_tokens to service_role;
