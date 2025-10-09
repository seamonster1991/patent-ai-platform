-- Enable RLS and add policies for user_activities so authenticated users can read/write their own rows
-- Run this in Supabase SQL editor or apply via Supabase CLI migrations

begin;

-- Ensure table exists
-- Note: Adjust schema name if not public
alter table if exists public.user_activities enable row level security;

-- Remove existing policies with same names if present to avoid duplicates
do $$
begin
  if exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'user_activities' and policyname = 'insert own activities'
  ) then
    execute 'drop policy "insert own activities" on public.user_activities';
  end if;
  if exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'user_activities' and policyname = 'select own activities'
  ) then
    execute 'drop policy "select own activities" on public.user_activities';
  end if;
  if exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'user_activities' and policyname = 'update own activities'
  ) then
    execute 'drop policy "update own activities" on public.user_activities';
  end if;
  if exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'user_activities' and policyname = 'delete own activities'
  ) then
    execute 'drop policy "delete own activities" on public.user_activities';
  end if;
end $$;

-- Insert policy: only allow inserting rows for the authenticated user
create policy "insert own activities"
  on public.user_activities
  for insert
  to authenticated
  with check (auth.uid() = user_id);

-- Select policy: only allow reading rows belonging to authenticated user
create policy "select own activities"
  on public.user_activities
  for select
  to authenticated
  using (auth.uid() = user_id);

-- Optional: allow updates/deletes on own rows (comment out if not needed)
create policy "update own activities"
  on public.user_activities
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "delete own activities"
  on public.user_activities
  for delete
  to authenticated
  using (auth.uid() = user_id);

commit;