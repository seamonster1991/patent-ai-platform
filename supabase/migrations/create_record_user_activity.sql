-- Create SECURITY DEFINER RPC to record user activities safely under RLS
-- Run in Supabase SQL editor or apply via CLI migrations

begin;

-- Require pgcrypto for gen_random_uuid
create extension if not exists pgcrypto;

create or replace function public.record_user_activity(
  p_user_id uuid,
  p_activity_type text,
  p_activity_data jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid := gen_random_uuid();
begin
  -- Enforce that caller matches the target user
  if auth.uid() is null or auth.uid() <> p_user_id then
    raise exception 'unauthorized';
  end if;

  insert into public.user_activities(id, user_id, activity_type, activity_data, created_at)
  values (v_id, p_user_id, p_activity_type, p_activity_data, now());

  return v_id;
end;
$$;

-- Allow authenticated role to execute RPC
grant execute on function public.record_user_activity(uuid, text, jsonb) to authenticated;

commit;