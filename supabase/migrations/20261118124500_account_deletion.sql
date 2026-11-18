alter table public.shared_announcements
  alter column created_by drop not null;

alter table public.shared_announcements
  drop constraint if exists shared_announcements_created_by_fkey,
  add constraint shared_announcements_created_by_fkey
    foreign key (created_by)
    references auth.users (id)
    on delete set null;
