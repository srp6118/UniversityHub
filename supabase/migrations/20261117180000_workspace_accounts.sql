create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null default '' check (char_length(full_name) <= 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  provider text not null check (provider in (
    'canvas',
    'google_drive',
    'google_calendar',
    'outlook_mail',
    'outlook_calendar',
    'onedrive',
    'onenote'
  )),
  account_label text,
  status text not null default 'connected' check (status in ('connected', 'expired', 'error')),
  last_synced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, provider)
);

create table public.workspace_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  provider text not null check (provider in (
    'canvas',
    'google_drive',
    'google_calendar',
    'outlook_mail',
    'outlook_calendar',
    'onedrive',
    'onenote',
    'uploads'
  )),
  external_id text,
  record_type text not null check (char_length(record_type) <= 80),
  title text not null check (char_length(title) <= 500),
  summary text,
  due_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index workspace_records_user_due_at_idx
  on public.workspace_records (user_id, due_at)
  where due_at is not null;
create index workspace_records_user_provider_idx
  on public.workspace_records (user_id, provider);

create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create trigger connections_set_updated_at
before update on public.connections
for each row execute function public.set_updated_at();

create trigger workspace_records_set_updated_at
before update on public.workspace_records
for each row execute function public.set_updated_at();

create function public.create_profile_for_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name)
  values (
    new.id,
    left(coalesce(new.raw_user_meta_data ->> 'full_name', ''), 100)
  );
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.create_profile_for_new_user();

revoke all on function public.set_updated_at() from public, anon, authenticated;
revoke all on function public.create_profile_for_new_user() from public, anon, authenticated;

alter table public.profiles enable row level security;
alter table public.connections enable row level security;
alter table public.workspace_records enable row level security;

create policy "Users can read their own profile"
  on public.profiles for select
  to authenticated
  using ((select auth.uid()) = id);

create policy "Users can update their own profile"
  on public.profiles for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

create policy "Users can read their own connections"
  on public.connections for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can manage their own workspace records"
  on public.workspace_records for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

grant select, update on public.profiles to authenticated;
grant select on public.connections to authenticated;
grant select, insert, update, delete on public.workspace_records to authenticated;

insert into storage.buckets (id, name, public)
values ('university-files', 'university-files', false)
on conflict (id) do nothing;

create policy "Users can read their own uploaded files"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'university-files'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "Users can upload files to their own folder"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'university-files'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "Users can update their own uploaded files"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'university-files'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  )
  with check (
    bucket_id = 'university-files'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "Users can delete their own uploaded files"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'university-files'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
