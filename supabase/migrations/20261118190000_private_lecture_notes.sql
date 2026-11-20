create table public.lecture_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 1 and 120),
  recorded_on date not null default current_date,
  duration_seconds integer not null check (duration_seconds between 1 and 10800),
  transcript text not null check (char_length(btrim(transcript)) between 1 and 200000),
  created_at timestamptz not null default now()
);

create index lecture_notes_user_created_at_idx
  on public.lecture_notes (user_id, created_at desc);

alter table public.lecture_notes enable row level security;

create policy "Users can read their own lecture notes"
  on public.lecture_notes for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can delete their own lecture notes"
  on public.lecture_notes for delete
  to authenticated
  using ((select auth.uid()) = user_id);

grant select, delete on public.lecture_notes to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'lecture-audio-temp',
  'lecture-audio-temp',
  false,
  20971520,
  array['audio/webm', 'audio/mp4', 'audio/ogg', 'audio/mpeg', 'audio/wav', 'audio/x-wav', 'audio/aac']
)
on conflict (id) do update
set public = false,
    file_size_limit = 20971520,
    allowed_mime_types = excluded.allowed_mime_types;

create policy "Users can upload their own temporary lecture audio"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'lecture-audio-temp'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "Users can remove their own temporary lecture audio"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'lecture-audio-temp'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
