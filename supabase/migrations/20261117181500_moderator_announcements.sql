create table public.user_roles (
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null check (role in ('moderator')),
  created_at timestamptz not null default now(),
  primary key (user_id, role)
);

alter table public.user_roles enable row level security;

create policy "Users can read their own assigned roles"
  on public.user_roles for select
  to authenticated
  using ((select auth.uid()) = user_id);

revoke all on public.user_roles from anon, authenticated;
grant select on public.user_roles to authenticated;

create function public.is_moderator()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.user_roles
    where user_id = (select auth.uid())
      and role = 'moderator'
  );
$$;

revoke all on function public.is_moderator() from public, anon, authenticated;
grant execute on function public.is_moderator() to authenticated;

create table public.shared_announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 120),
  body text not null check (char_length(body) between 1 and 2000),
  is_published boolean not null default false,
  created_by uuid not null references auth.users (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index shared_announcements_published_updated_idx
  on public.shared_announcements (updated_at desc)
  where is_published;

create trigger shared_announcements_set_updated_at
before update on public.shared_announcements
for each row execute function public.set_updated_at();

alter table public.shared_announcements enable row level security;

create policy "Members can read published announcements"
  on public.shared_announcements for select
  to authenticated
  using (is_published or (select public.is_moderator()));

create policy "Moderators can publish announcements"
  on public.shared_announcements for insert
  to authenticated
  with check (
    (select public.is_moderator())
    and created_by = (select auth.uid())
  );

create policy "Moderators can edit announcements"
  on public.shared_announcements for update
  to authenticated
  using ((select public.is_moderator()))
  with check ((select public.is_moderator()));

create policy "Moderators can delete announcements"
  on public.shared_announcements for delete
  to authenticated
  using ((select public.is_moderator()));

grant select, insert, update, delete on public.shared_announcements to authenticated;
