-- Gate QA-01: isolated, server-owned Production QA entitlements.
-- Additive only. No existing plan, billing, quota, or book rows are rewritten.
create table public.qa_test_entitlements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  is_enabled boolean not null default false,
  allow_publish boolean not null default false,
  publication_limit integer check (publication_limit is null or publication_limit between 1 and 10),
  allow_quick_design boolean not null default true,
  allow_full_design boolean not null default false,
  allow_ai_critic boolean not null default false,
  quick_daily_limit integer check (quick_daily_limit is null or quick_daily_limit between 1 and 30),
  quick_monthly_limit integer check (quick_monthly_limit is null or quick_monthly_limit between 1 and 100),
  full_daily_limit integer check (full_daily_limit is null or full_daily_limit between 1 and 3),
  full_monthly_limit integer check (full_monthly_limit is null or full_monthly_limit between 1 and 30),
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  label text,
  notes text
);
create index qa_test_entitlements_enabled_idx on public.qa_test_entitlements(is_enabled, expires_at);
alter table public.qa_test_entitlements enable row level security;
revoke all on table public.qa_test_entitlements from anon, authenticated;
grant all on table public.qa_test_entitlements to service_role;

create table public.qa_test_entitlement_audit (
  id uuid primary key default gen_random_uuid(),
  entitlement_id uuid references public.qa_test_entitlements(id) on delete set null,
  user_id uuid not null references auth.users(id) on delete cascade,
  changed_by uuid references auth.users(id) on delete set null,
  previous_state jsonb,
  new_state jsonb not null,
  changed_at timestamptz not null default now()
);
create index qa_test_entitlement_audit_user_idx on public.qa_test_entitlement_audit(user_id, changed_at desc);
alter table public.qa_test_entitlement_audit enable row level security;
revoke all on table public.qa_test_entitlement_audit from anon, authenticated;
grant all on table public.qa_test_entitlement_audit to service_role;

alter table public.full_design_plan_limits drop constraint if exists full_design_plan_limits_plan_code_check;
alter table public.full_design_plan_limits add constraint full_design_plan_limits_plan_code_check
  check (plan_code in ('free','publication','operation_standard','operation','qa'));
insert into public.full_design_plan_limits(plan_code) values ('qa') on conflict (plan_code) do nothing;

alter table public.full_design_runs drop constraint if exists full_design_runs_plan_code_check;
alter table public.full_design_runs add constraint full_design_runs_plan_code_check
  check (plan_code in ('free','publication','operation_standard','operation','qa'));

create or replace function public.reserve_full_design_run(p_owner_id uuid, p_plan_code text)
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
  if p_plan_code = 'qa' then
    select full_daily_limit into v_limit from public.qa_test_entitlements
      where user_id = p_owner_id and is_enabled and allow_full_design
        and (expires_at is null or expires_at > now());
  else
    select daily_limit into v_limit from public.full_design_plan_limits where plan_code = p_plan_code;
  end if;
  if v_limit is null then return jsonb_build_object('allowed', false, 'reason', 'unconfigured'); end if;
  update public.full_design_runs set status = 'failure', failure_stage = 'expired', finished_at = now()
    where owner_id = p_owner_id and status = 'reserved' and expires_at <= now();
  select count(*) into v_count from public.full_design_runs
    where owner_id = p_owner_id and mode = 'api-on' and plan_code = p_plan_code
      and created_at >= v_start and status in ('reserved','success');
  if v_count >= v_limit then return jsonb_build_object('allowed', false, 'reason', 'daily'); end if;
  select count(*) into v_attempts from public.full_design_runs
    where owner_id = p_owner_id and mode = 'api-on' and plan_code = p_plan_code
      and created_at >= now() - interval '1 hour';
  if v_attempts >= 30 then return jsonb_build_object('allowed', false, 'reason', 'retry-guard'); end if;
  insert into public.full_design_runs(owner_id, mode, plan_code, status, expires_at)
    values (p_owner_id, 'api-on', p_plan_code, 'reserved', now() + interval '5 minutes') returning id into v_id;
  return jsonb_build_object('allowed', true, 'run_id', v_id);
end;
$$;
revoke all on function public.reserve_full_design_run(uuid,text) from public, anon, authenticated;
grant execute on function public.reserve_full_design_run(uuid,text) to service_role;
