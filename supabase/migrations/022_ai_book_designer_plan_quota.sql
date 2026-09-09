-- Gate37: plan-based AI Book Designer quota. Additive only; legacy usage is preserved.
create table if not exists public.ai_book_designer_plan_usage (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plan_code text not null check (plan_code in ('free', 'publication', 'operation_standard', 'operation')),
  book_id uuid references public.books(id) on delete cascade,
  usage_date_jst date not null,
  usage_month_jst date not null,
  request_count integer not null default 0 check (request_count >= 0 and request_count <= 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists ai_book_designer_plan_usage_user_date_idx
  on public.ai_book_designer_plan_usage(user_id, usage_date_jst desc);

create index if not exists ai_book_designer_plan_usage_user_month_idx
  on public.ai_book_designer_plan_usage(user_id, usage_month_jst desc);

create index if not exists ai_book_designer_plan_usage_book_idx
  on public.ai_book_designer_plan_usage(user_id, book_id, usage_date_jst desc)
  where book_id is not null;

create unique index if not exists ai_book_designer_plan_usage_account_day_idx
  on public.ai_book_designer_plan_usage(user_id, plan_code, usage_date_jst)
  where book_id is null;

create unique index if not exists ai_book_designer_plan_usage_book_day_idx
  on public.ai_book_designer_plan_usage(user_id, plan_code, book_id, usage_date_jst)
  where book_id is not null;

alter table public.ai_book_designer_plan_usage enable row level security;
revoke all on table public.ai_book_designer_plan_usage from anon, authenticated;

create or replace function public.consume_ai_book_designer_plan_quota(
  p_user_id uuid,
  p_plan_code text,
  p_book_id uuid default null,
  p_now timestamptz default now()
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  jst_date date := (p_now at time zone 'Asia/Tokyo')::date;
  jst_month date := date_trunc('month', (p_now at time zone 'Asia/Tokyo'))::date;
  scoped_book_id uuid := case when p_plan_code = 'publication' then p_book_id else null end;
  daily_limit integer;
  monthly_limit integer;
  lifetime_limit integer;
  daily_count integer;
  monthly_count integer;
  lifetime_count integer;
  legacy_daily_count integer;
  legacy_monthly_count integer;
  usage_id uuid;
begin
  if p_user_id is null or p_plan_code not in ('free', 'publication', 'operation_standard', 'operation') then
    return jsonb_build_object('allowed', false, 'reason', 'invalid_plan');
  end if;
  if p_plan_code = 'publication' and scoped_book_id is null then
    return jsonb_build_object('allowed', false, 'reason', 'book_required');
  end if;

  -- Serialize one user's active quota scope so concurrent successful requests
  -- cannot pass the check before either increment becomes visible.
  perform pg_advisory_xact_lock(hashtextextended(
    p_user_id::text || ':' || case when p_plan_code = 'publication' then 'publication:' || scoped_book_id::text else 'account' end,
    37001
  ));

  daily_limit := case p_plan_code
    when 'free' then 1
    when 'publication' then 5
    when 'operation_standard' then 5
    when 'operation' then 10
  end;
  monthly_limit := case p_plan_code
    when 'free' then 3
    when 'operation_standard' then 20
    when 'operation' then 40
    else null
  end;
  lifetime_limit := case when p_plan_code = 'publication' then 20 else null end;

  -- Preserve the old success-only usage for the release-day cutover. The old
  -- table has no plan/book scope, so it is never backfilled into lifetime use.
  select coalesce(sum(request_count), 0)::integer
    into legacy_daily_count
    from public.ai_book_designer_usage
   where user_id = p_user_id and usage_date = jst_date;
  select coalesce(sum(request_count), 0)::integer
    into legacy_monthly_count
    from public.ai_book_designer_usage
   where user_id = p_user_id
     and usage_date between (jst_month - 1) and jst_date;

  select legacy_daily_count + coalesce(sum(request_count), 0)::integer
    into daily_count
    from public.ai_book_designer_plan_usage
   where user_id = p_user_id
     and (
       (p_plan_code = 'publication' and plan_code = 'publication' and book_id is not distinct from scoped_book_id)
       or (p_plan_code <> 'publication' and plan_code in ('free', 'operation_standard', 'operation') and book_id is null)
     )
     and usage_date_jst = jst_date;

  select legacy_monthly_count + coalesce(sum(request_count), 0)::integer
    into monthly_count
    from public.ai_book_designer_plan_usage
   where user_id = p_user_id
     and (
       (p_plan_code = 'publication' and plan_code = 'publication' and book_id is not distinct from scoped_book_id)
       or (p_plan_code <> 'publication' and plan_code in ('free', 'operation_standard', 'operation') and book_id is null)
     )
     and usage_month_jst = jst_month;

  select coalesce(sum(request_count), 0)::integer
    into lifetime_count
    from public.ai_book_designer_plan_usage
   where user_id = p_user_id
     and plan_code = 'publication'
     and book_id = scoped_book_id;

  if daily_count >= daily_limit then
    return jsonb_build_object('allowed', false, 'reason', 'daily', 'dailyCount', daily_count, 'dailyLimit', daily_limit, 'monthlyCount', monthly_count, 'monthlyLimit', monthly_limit, 'lifetimeCount', lifetime_count, 'lifetimeLimit', lifetime_limit);
  end if;
  if monthly_limit is not null and monthly_count >= monthly_limit then
    return jsonb_build_object('allowed', false, 'reason', 'monthly', 'dailyCount', daily_count, 'dailyLimit', daily_limit, 'monthlyCount', monthly_count, 'monthlyLimit', monthly_limit, 'lifetimeCount', lifetime_count, 'lifetimeLimit', lifetime_limit);
  end if;
  if lifetime_limit is not null and lifetime_count >= lifetime_limit then
    return jsonb_build_object('allowed', false, 'reason', 'lifetime', 'dailyCount', daily_count, 'dailyLimit', daily_limit, 'monthlyCount', monthly_count, 'monthlyLimit', monthly_limit, 'lifetimeCount', lifetime_count, 'lifetimeLimit', lifetime_limit);
  end if;

  select id into usage_id
    from public.ai_book_designer_plan_usage
   where user_id = p_user_id
     and plan_code = p_plan_code
     and book_id is not distinct from scoped_book_id
     and usage_date_jst = jst_date
   for update;

  if usage_id is null then
    insert into public.ai_book_designer_plan_usage(user_id, plan_code, book_id, usage_date_jst, usage_month_jst, request_count)
    values (p_user_id, p_plan_code, scoped_book_id, jst_date, jst_month, 1);
  else
    update public.ai_book_designer_plan_usage
       set request_count = request_count + 1, updated_at = now()
     where id = usage_id;
  end if;

  return jsonb_build_object(
    'allowed', true,
    'reason', 'allowed',
    'dailyCount', daily_count + 1,
    'dailyLimit', daily_limit,
    'monthlyCount', monthly_count + 1,
    'monthlyLimit', monthly_limit,
    'lifetimeCount', case when lifetime_limit is null then null else lifetime_count + 1 end,
    'lifetimeLimit', lifetime_limit
  );
end;
$$;

revoke all on function public.consume_ai_book_designer_plan_quota(uuid, text, uuid, timestamptz) from public, anon, authenticated;
grant execute on function public.consume_ai_book_designer_plan_quota(uuid, text, uuid, timestamptz) to service_role;
