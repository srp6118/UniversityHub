create table public.budget_periods (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  period_type text not null check (period_type in ('weekly', 'monthly')),
  period_start date not null,
  limit_cents bigint not null check (limit_cents >= 0 and limit_cents <= 100000000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, period_type, period_start),
  unique (user_id, id),
  check (
    (period_type = 'weekly' and extract(isodow from period_start) = 1)
    or (period_type = 'monthly' and extract(day from period_start) = 1)
  )
);

create table public.budget_category_limits (
  user_id uuid not null,
  budget_id uuid not null,
  category text not null check (category in ('food', 'transport', 'study', 'social', 'other')),
  limit_cents bigint not null check (limit_cents >= 0 and limit_cents <= 100000000),
  primary key (budget_id, category),
  foreign key (user_id, budget_id)
    references public.budget_periods (user_id, id)
    on delete cascade
);

create table public.budget_recurring_costs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 1 and 120),
  amount_cents bigint not null check (amount_cents > 0 and amount_cents <= 100000000),
  category text not null check (category in ('food', 'transport', 'study', 'social', 'other')),
  recurrence text not null check (recurrence in ('weekly', 'monthly', 'yearly')),
  next_due_on date not null,
  note text not null default '' check (char_length(note) <= 500),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, id)
);

create table public.budget_social_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 100),
  event_on date not null,
  limit_cents bigint not null check (limit_cents > 0 and limit_cents <= 100000000),
  note text not null default '' check (char_length(note) <= 500),
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, id)
);

create table public.budget_expenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  amount_cents bigint not null check (amount_cents > 0 and amount_cents <= 100000000),
  spent_on date not null check (spent_on <= current_date),
  category text not null check (category in ('food', 'transport', 'study', 'social', 'other')),
  note text not null default '' check (char_length(note) <= 500),
  event_id uuid references public.budget_social_events (id) on delete set null,
  recurring_cost_id uuid references public.budget_recurring_costs (id) on delete restrict,
  recurring_due_on date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, recurring_cost_id, recurring_due_on),
  check (
    (recurring_cost_id is null and recurring_due_on is null)
    or (recurring_cost_id is not null and recurring_due_on is not null)
  )
);

create table public.budget_reminder_preferences (
  user_id uuid primary key references auth.users (id) on delete cascade,
  enabled boolean not null default false,
  thresholds integer[] not null default array[80, 100],
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (cardinality(thresholds) <= 2),
  check (thresholds <@ array[80, 100]),
  check (not enabled or cardinality(thresholds) >= 1)
);

create table public.budget_email_reminders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  period_type text not null check (period_type in ('weekly', 'monthly')),
  period_start date not null,
  threshold integer not null check (threshold in (80, 100)),
  status text not null default 'sending' check (status in ('sending', 'sent', 'failed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  sent_at timestamptz,
  unique (user_id, period_type, period_start, threshold)
);

create index budget_expenses_user_spent_on_idx
  on public.budget_expenses (user_id, spent_on desc);
create index budget_recurring_costs_user_due_idx
  on public.budget_recurring_costs (user_id, next_due_on)
  where active;
create index budget_social_events_user_date_idx
  on public.budget_social_events (user_id, event_on)
  where archived_at is null;

create view public.budget_expense_daily_totals
with (security_invoker = true)
as
select
  user_id,
  spent_on,
  category,
  sum(amount_cents)::bigint as amount_cents,
  count(*)::integer as expense_count
from public.budget_expenses
group by user_id, spent_on, category;

create view public.budget_social_event_totals
with (security_invoker = true)
as
select
  user_id,
  event_id,
  sum(amount_cents)::bigint as amount_cents
from public.budget_expenses
where event_id is not null
group by user_id, event_id;

grant select on public.budget_expense_daily_totals to authenticated;
grant select on public.budget_social_event_totals to authenticated;

create trigger budget_periods_set_updated_at
before update on public.budget_periods
for each row execute function public.set_updated_at();

create trigger budget_recurring_costs_set_updated_at
before update on public.budget_recurring_costs
for each row execute function public.set_updated_at();

create trigger budget_social_events_set_updated_at
before update on public.budget_social_events
for each row execute function public.set_updated_at();

create trigger budget_expenses_set_updated_at
before update on public.budget_expenses
for each row execute function public.set_updated_at();

create trigger budget_reminder_preferences_set_updated_at
before update on public.budget_reminder_preferences
for each row execute function public.set_updated_at();

create function public.ensure_budget_limit_covers_allocations()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  allocated_cents bigint;
begin
  if new.limit_cents is distinct from old.limit_cents then
    select coalesce(sum(limit_cents), 0)
      into allocated_cents
      from public.budget_category_limits
      where budget_id = new.id
        and user_id = new.user_id;
    if allocated_cents > new.limit_cents then
      raise exception 'Reduce category allocations before lowering the overall budget.';
    end if;
  end if;
  return new;
end;
$$;

create trigger budget_periods_check_allocations
before update of limit_cents on public.budget_periods
for each row execute function public.ensure_budget_limit_covers_allocations();

create function public.save_budget_category_limits(
  p_budget_id uuid,
  p_allocations jsonb
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  budget_limit bigint;
  allocation jsonb;
  allocation_category text;
  allocation_cents bigint;
  total_cents bigint := 0;
begin
  if auth.uid() is null then
    raise exception 'Sign in to save category limits.';
  end if;
  if p_allocations is null or jsonb_typeof(p_allocations) <> 'array' then
    raise exception 'Category allocations are invalid.';
  end if;
  if jsonb_array_length(p_allocations) > 5 then
    raise exception 'Category allocations are invalid.';
  end if;

  select limit_cents
    into budget_limit
    from public.budget_periods
    where id = p_budget_id
      and user_id = auth.uid()
    for update;
  if not found then
    raise exception 'Budget period not found.';
  end if;

  for allocation in select value from jsonb_array_elements(p_allocations)
  loop
    allocation_category := allocation ->> 'category';
    if allocation_category is null
      or allocation_category not in ('food', 'transport', 'study', 'social', 'other')
      or coalesce(allocation ->> 'limit_cents', '') !~ '^[0-9]{1,9}$' then
      raise exception 'Category allocations are invalid.';
    end if;
    allocation_cents := (allocation ->> 'limit_cents')::bigint;
    if allocation_cents > 100000000 then
      raise exception 'Category allocations are too large.';
    end if;
    total_cents := total_cents + allocation_cents;
  end loop;

  if total_cents > budget_limit then
    raise exception 'Category allocations cannot exceed the overall budget.';
  end if;

  delete from public.budget_category_limits
    where budget_id = p_budget_id
      and user_id = auth.uid();

  for allocation in select value from jsonb_array_elements(p_allocations)
  loop
    allocation_category := allocation ->> 'category';
    allocation_cents := (allocation ->> 'limit_cents')::bigint;
    if allocation_cents > 0 then
      insert into public.budget_category_limits (user_id, budget_id, category, limit_cents)
      values (auth.uid(), p_budget_id, allocation_category, allocation_cents);
    end if;
  end loop;
end;
$$;

create function public.record_recurring_cost_payment(
  p_recurring_cost_id uuid,
  p_paid_on date default current_date,
  p_note text default ''
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  cost public.budget_recurring_costs%rowtype;
  new_expense_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Sign in to record a recurring payment.';
  end if;
  if p_paid_on is null or p_paid_on > current_date then
    raise exception 'A payment date cannot be in the future.';
  end if;
  if char_length(coalesce(p_note, '')) > 500 then
    raise exception 'Notes must be 500 characters or fewer.';
  end if;

  select *
    into cost
    from public.budget_recurring_costs
    where id = p_recurring_cost_id
      and user_id = auth.uid()
      and active
    for update;
  if not found then
    raise exception 'Active recurring cost not found.';
  end if;

  insert into public.budget_expenses (
    user_id,
    amount_cents,
    spent_on,
    category,
    note,
    recurring_cost_id,
    recurring_due_on
  )
  values (
    auth.uid(),
    cost.amount_cents,
    p_paid_on,
    cost.category,
    coalesce(p_note, ''),
    cost.id,
    cost.next_due_on
  )
  returning id into new_expense_id;

  update public.budget_recurring_costs
    set next_due_on = case cost.recurrence
      when 'weekly' then cost.next_due_on + 7
      when 'monthly' then (cost.next_due_on + interval '1 month')::date
      else (cost.next_due_on + interval '1 year')::date
    end
    where id = cost.id
      and user_id = auth.uid();

  return new_expense_id;
end;
$$;

create function public.delete_recurring_cost_payment(p_expense_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  expense public.budget_expenses%rowtype;
  cost public.budget_recurring_costs%rowtype;
  expected_next_due date;
begin
  if auth.uid() is null then
    raise exception 'Sign in to delete this expense.';
  end if;

  select *
    into expense
    from public.budget_expenses
    where id = p_expense_id
      and user_id = auth.uid()
    for update;
  if not found then
    raise exception 'Expense not found.';
  end if;
  if expense.recurring_cost_id is null then
    raise exception 'This is not a recurring payment.';
  end if;

  select *
    into cost
    from public.budget_recurring_costs
    where id = expense.recurring_cost_id
      and user_id = auth.uid()
    for update;
  if not found then
    raise exception 'Recurring cost not found.';
  end if;

  expected_next_due := case cost.recurrence
    when 'weekly' then expense.recurring_due_on + 7
    when 'monthly' then (expense.recurring_due_on + interval '1 month')::date
    else (expense.recurring_due_on + interval '1 year')::date
  end;
  if cost.next_due_on = expected_next_due and not exists (
    select 1
      from public.budget_expenses
      where recurring_cost_id = cost.id
        and recurring_due_on > expense.recurring_due_on
  ) then
    update public.budget_recurring_costs
      set next_due_on = expense.recurring_due_on
      where id = cost.id
        and user_id = auth.uid();
  end if;

  delete from public.budget_expenses
    where id = expense.id
      and user_id = auth.uid();
end;
$$;

create function public.prevent_recurring_expense_detach()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.recurring_cost_id is not null and (
    new.recurring_cost_id is distinct from old.recurring_cost_id
    or new.recurring_due_on is distinct from old.recurring_due_on
  ) then
    raise exception 'Recurring payment links cannot be changed.';
  end if;
  return new;
end;
$$;

create trigger budget_expenses_keep_recurring_link
before update of recurring_cost_id, recurring_due_on on public.budget_expenses
for each row execute function public.prevent_recurring_expense_detach();

revoke all on function public.ensure_budget_limit_covers_allocations() from public, anon, authenticated;
revoke all on function public.save_budget_category_limits(uuid, jsonb) from public, anon, authenticated;
revoke all on function public.record_recurring_cost_payment(uuid, date, text) from public, anon, authenticated;
revoke all on function public.delete_recurring_cost_payment(uuid) from public, anon, authenticated;
revoke all on function public.prevent_recurring_expense_detach() from public, anon, authenticated;
grant execute on function public.save_budget_category_limits(uuid, jsonb) to authenticated;
grant execute on function public.record_recurring_cost_payment(uuid, date, text) to authenticated;
grant execute on function public.delete_recurring_cost_payment(uuid) to authenticated;

alter table public.budget_periods enable row level security;
alter table public.budget_category_limits enable row level security;
alter table public.budget_recurring_costs enable row level security;
alter table public.budget_social_events enable row level security;
alter table public.budget_expenses enable row level security;
alter table public.budget_reminder_preferences enable row level security;
alter table public.budget_email_reminders enable row level security;

create policy "Users manage their own budget periods"
  on public.budget_periods for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users can read their own category limits"
  on public.budget_category_limits for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users manage their own recurring costs"
  on public.budget_recurring_costs for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users manage their own social events"
  on public.budget_social_events for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users read their own expenses"
  on public.budget_expenses for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users add their own expenses"
  on public.budget_expenses for insert
  to authenticated
  with check (
    (select auth.uid()) = user_id
    and (
      event_id is null
      or exists (
        select 1
        from public.budget_social_events event
        where event.id = event_id
          and event.user_id = (select auth.uid())
      )
    )
    and (
      recurring_cost_id is null
      or exists (
        select 1
        from public.budget_recurring_costs cost
        where cost.id = recurring_cost_id
          and cost.user_id = (select auth.uid())
      )
    )
  );

create policy "Users update their own expenses"
  on public.budget_expenses for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id
    and (
      event_id is null
      or exists (
        select 1
        from public.budget_social_events event
        where event.id = event_id
          and event.user_id = (select auth.uid())
      )
    )
    and (
      recurring_cost_id is null
      or exists (
        select 1
        from public.budget_recurring_costs cost
        where cost.id = recurring_cost_id
          and cost.user_id = (select auth.uid())
      )
    )
  );

create policy "Users delete their own non-recurring expenses"
  on public.budget_expenses for delete
  to authenticated
  using ((select auth.uid()) = user_id and recurring_cost_id is null);

create policy "Users manage their own budget reminder preferences"
  on public.budget_reminder_preferences for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

revoke all on public.budget_email_reminders from public, anon, authenticated;
grant all on public.budget_email_reminders to service_role;

grant select, insert, update, delete on public.budget_periods to authenticated;
grant select on public.budget_category_limits to authenticated;
grant select, insert, update, delete on public.budget_recurring_costs to authenticated;
grant select, insert, update, delete on public.budget_social_events to authenticated;
grant select, insert, update, delete on public.budget_expenses to authenticated;
grant select, insert, update, delete on public.budget_reminder_preferences to authenticated;
