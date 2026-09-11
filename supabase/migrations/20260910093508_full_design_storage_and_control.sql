-- Additive Full Design infrastructure. No Book/Quick Design rows are touched.
-- Rollback strategy: deploy the previous app and leave these isolated tables
-- in place. Turn the API flag OFF; do not drop owner data.
create table public.full_design_settings (
  key text primary key check (key = 'ai_full_design_api_enabled'),
  value boolean not null default false,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);
alter table public.full_design_settings enable row level security;
revoke all on public.full_design_settings from anon, authenticated;
grant all on public.full_design_settings to service_role;
insert into public.full_design_settings(key, value) values ('ai_full_design_api_enabled', false);

-- NULL means unconfigured, not unlimited. No final commercial quota is chosen.
create table public.full_design_plan_limits (
  plan_code text primary key check (plan_code in ('free','publication','operation_standard','operation')),
  daily_limit integer check (daily_limit between 1 and 1000),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);
alter table public.full_design_plan_limits enable row level security;
revoke all on public.full_design_plan_limits from anon, authenticated;
grant all on public.full_design_plan_limits to service_role;
insert into public.full_design_plan_limits(plan_code) values ('free'),('publication'),('operation_standard'),('operation');

create table public.full_design_runs (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  mode text not null check (mode in ('api-on','api-off','my-design')),
  plan_code text not null check (plan_code in ('free','publication','operation_standard','operation')),
  status text not null check (status in ('reserved','success','failure')),
  model text,
  input_tokens integer not null default 0 check (input_tokens >= 0),
  output_tokens integer not null default 0 check (output_tokens >= 0),
  cached_tokens integer not null default 0 check (cached_tokens >= 0 and cached_tokens <= input_tokens),
  latency_ms integer not null default 0 check (latency_ms >= 0),
  failure_stage text check (failure_stage in ('provider','validation','timeout','expired','internal')),
  created_at timestamptz not null default now(),
  finished_at timestamptz,
  expires_at timestamptz,
  check (mode = 'api-on' or (input_tokens = 0 and output_tokens = 0 and cached_tokens = 0 and model is null))
);
create index full_design_runs_owner_created_idx on public.full_design_runs(owner_id, created_at desc);
alter table public.full_design_runs enable row level security;
revoke all on public.full_design_runs from anon, authenticated;
grant select on public.full_design_runs to authenticated;
grant all on public.full_design_runs to service_role;
create policy full_design_runs_owner_read on public.full_design_runs for select to authenticated using (owner_id = (select auth.uid()));

create table public.my_designs (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (length(trim(name)) between 1 and 80),
  grammar jsonb not null check (jsonb_typeof(grammar) = 'object' and octet_length(grammar::text) <= 16000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index my_designs_owner_created_idx on public.my_designs(owner_id, created_at desc);
alter table public.my_designs enable row level security;
revoke all on public.my_designs from anon, authenticated;
-- Creation/rename use the authenticated application route's strict grammar
-- validator. Direct raw JSON writes cannot bypass the no-manuscript boundary.
grant select, delete on public.my_designs to authenticated;
grant all on public.my_designs to service_role;
create policy my_designs_owner on public.my_designs for all to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));

create function public.reserve_full_design_run(p_owner_id uuid, p_plan_code text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_limit integer;
  v_count integer;
  v_attempts integer;
  v_id uuid;
  v_start timestamptz := date_trunc('day', now() at time zone 'Asia/Tokyo') at time zone 'Asia/Tokyo';
begin
  perform pg_advisory_xact_lock(hashtextextended('full-design:' || p_owner_id::text, 0));
  if not exists (select 1 from public.full_design_settings where key = 'ai_full_design_api_enabled' and value) then
    return jsonb_build_object('allowed', false, 'reason', 'api-off');
  end if;
  select daily_limit into v_limit from public.full_design_plan_limits where plan_code = p_plan_code;
  if v_limit is null then return jsonb_build_object('allowed', false, 'reason', 'unconfigured'); end if;
  update public.full_design_runs set status = 'failure', failure_stage = 'expired', finished_at = now()
    where owner_id = p_owner_id and status = 'reserved' and expires_at <= now();
  select count(*) into v_count from public.full_design_runs
    where owner_id = p_owner_id and mode = 'api-on' and created_at >= v_start and status in ('reserved','success');
  if v_count >= v_limit then return jsonb_build_object('allowed', false, 'reason', 'daily'); end if;
  -- Failure retries do not consume successful-generation quota. A separate
  -- bounded operational abuse guard still prevents infinite upstream spend.
  select count(*) into v_attempts from public.full_design_runs
    where owner_id = p_owner_id and mode = 'api-on' and created_at >= now() - interval '1 hour';
  if v_attempts >= 30 then return jsonb_build_object('allowed', false, 'reason', 'retry-guard'); end if;
  insert into public.full_design_runs(owner_id, mode, plan_code, status, expires_at)
    values (p_owner_id, 'api-on', p_plan_code, 'reserved', now() + interval '5 minutes') returning id into v_id;
  return jsonb_build_object('allowed', true, 'run_id', v_id);
end;
$$;
revoke all on function public.reserve_full_design_run(uuid,text) from public, anon, authenticated;
grant execute on function public.reserve_full_design_run(uuid,text) to service_role;

create function public.finish_full_design_run(
  p_id uuid, p_owner_id uuid, p_success boolean, p_model text,
  p_input integer, p_output integer, p_cached integer, p_latency integer, p_failure text
) returns boolean language plpgsql security definer set search_path = '' as $$
declare v_updated integer;
begin
  perform pg_advisory_xact_lock(hashtextextended('full-design:' || p_owner_id::text, 0));
  update public.full_design_runs set
    status = case when p_success then 'success' else 'failure' end,
    model = left(p_model,80), input_tokens = p_input, output_tokens = p_output,
    cached_tokens = p_cached, latency_ms = p_latency,
    failure_stage = case when p_success then null else p_failure end, finished_at = now()
  where id = p_id and owner_id = p_owner_id and status = 'reserved' and expires_at > now();
  get diagnostics v_updated = row_count;
  return v_updated = 1;
end;
$$;
revoke all on function public.finish_full_design_run(uuid,uuid,boolean,text,integer,integer,integer,integer,text) from public, anon, authenticated;
grant execute on function public.finish_full_design_run(uuid,uuid,boolean,text,integer,integer,integer,integer,text) to service_role;
