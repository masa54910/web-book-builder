-- Pricing Finalization: add the ¥980/month Standard plan while preserving
-- legacy `operation` rows as the ¥1,980/month Plus plan.
-- Forward-only; no existing rows are changed or deleted.

alter table public.plan_billing_transactions
  drop constraint if exists plan_billing_transactions_plan_code_check;

alter table public.plan_billing_transactions
  add constraint plan_billing_transactions_plan_code_check
  check (plan_code in ('publication', 'operation_standard', 'operation'));

alter table public.plan_entitlements
  drop constraint if exists plan_entitlements_plan_code_check;

alter table public.plan_entitlements
  add constraint plan_entitlements_plan_code_check
  check (plan_code in ('publication', 'operation_standard', 'operation'));

-- Keep one active subscription per account across Standard and legacy Plus.
drop index if exists public.plan_billing_operation_active_idx;

create unique index if not exists plan_billing_operation_active_idx
  on public.plan_billing_transactions(user_id, livemode)
  where plan_code in ('operation_standard', 'operation') and status = 'paid';
