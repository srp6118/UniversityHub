insert into public.profiles (id, full_name)
select
  users.id,
  left(coalesce(users.raw_user_meta_data ->> 'full_name', ''), 100)
from auth.users as users
on conflict (id) do nothing;
