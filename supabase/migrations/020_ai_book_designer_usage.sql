-- Gate30-33: additive AI design generation quota. No existing data is rewritten.
create table if not exists public.ai_book_designer_usage (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  usage_date date not null default current_date,
  request_count integer not null default 0 check (request_count >= 0 and request_count <= 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, usage_date)
);

create index if not exists ai_book_designer_usage_user_date_idx
  on public.ai_book_designer_usage(user_id, usage_date desc);

alter table public.ai_book_designer_usage enable row level security;

drop policy if exists ai_book_designer_usage_select_owner on public.ai_book_designer_usage;
create policy ai_book_designer_usage_select_owner on public.ai_book_designer_usage
  for select using ((select auth.uid()) = user_id);

drop policy if exists ai_book_designer_usage_insert_owner on public.ai_book_designer_usage;
create policy ai_book_designer_usage_insert_owner on public.ai_book_designer_usage
  for insert with check ((select auth.uid()) = user_id);

drop policy if exists ai_book_designer_usage_update_owner on public.ai_book_designer_usage;
create policy ai_book_designer_usage_update_owner on public.ai_book_designer_usage
  for update using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

grant select, insert, update on public.ai_book_designer_usage to authenticated;

create or replace function public.consume_ai_book_designer_quota(p_user_id uuid, p_limit integer)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  next_count integer;
begin
  if p_user_id is null or p_limit < 1 then
    return false;
  end if;
  insert into public.ai_book_designer_usage(user_id, usage_date, request_count)
  values (p_user_id, current_date, 1)
  on conflict (user_id, usage_date)
  do update set request_count = ai_book_designer_usage.request_count + 1,
                updated_at = now()
  returning request_count into next_count;
  if next_count > p_limit then
    update public.ai_book_designer_usage
      set request_count = request_count - 1, updated_at = now()
      where user_id = p_user_id and usage_date = current_date;
    return false;
  end if;
  return true;
end;
$$;

revoke all on function public.consume_ai_book_designer_quota(uuid, integer) from public;
grant execute on function public.consume_ai_book_designer_quota(uuid, integer) to service_role;
