create policy "Users can save their own lecture notes"
  on public.lecture_notes for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

grant insert on public.lecture_notes to authenticated;

drop policy if exists "Users can upload their own temporary lecture audio"
  on storage.objects;
