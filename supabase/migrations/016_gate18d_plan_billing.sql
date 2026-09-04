-- Gate 18-D: platform plan billing foundation.
-- This schema is intentionally separate from book_purchases and Connect sales.
-- Forward-only and additive; no existing rows or constraints are changed.

create table if not exists public.plan_billing_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plan_code text not null check (plan_code in ('publication', 'operation')),
  book_id uuid references public.books(id) on delete cascade,
  stripe_checkout_session_id text not null unique check (stripe_checkout_session_id ~ '^cs_[A-Za-z0-9_]+$'),
  stripe_payment_intent_id text,
  stripe_customer_id text,
  stripe_subscription_id text,
  livemode boolean not null,
  amount integer not null check (amount >= 0),
  currency text not null check (currency in ('jpy', 'usd')),
  status text not null check (status in ('pending', 'paid', 'failed', 'canceled')),
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (plan_code <> 'publication' or book_id is not null)
);

create index if not exists plan_billing_transactions_user_idx
  on public.plan_billing_transactions(user_id, created_at desc);
create unique index if not exists plan_billing_publication_paid_idx
  on public.plan_billing_transactions(user_id, book_id, livemode)
  where plan_code = 'publication' and status = 'paid';
create unique index if not exists plan_billing_operation_active_idx
  on public.plan_billing_transactions(user_id, livemode)
  where plan_code = 'operation' and status = 'paid';

create table if not exists public.plan_entitlements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plan_code text not null check (plan_code in ('publication', 'operation')),
  book_id uuid references public.books(id) on delete cascade,
  transaction_id uuid not null references public.plan_billing_transactions(id) on delete restrict,
  livemode boolean not null,
  status text not null check (status in ('active', 'past_due', 'canceled', 'expired')),
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (plan_code <> 'publication' or book_id is not null)
);

create unique index if not exists plan_entitlements_unique_idx
  on public.plan_entitlements(user_id, plan_code, coalesce(book_id, '00000000-0000-0000-0000-000000000000'::uuid), livemode);
create index if not exists plan_entitlements_user_idx
  on public.plan_entitlements(user_id, status, livemode);

create trigger plan_billing_transactions_set_updated_at
before update on public.plan_billing_transactions
for each row execute procedure public.set_updated_at();

create trigger plan_entitlements_set_updated_at
before update on public.plan_entitlements
for each row execute procedure public.set_updated_at();

alter table public.plan_billing_transactions enable row level security;
alter table public.plan_entitlements enable row level security;
revoke all on table public.plan_billing_transactions from anon, authenticated;
revoke all on table public.plan_entitlements from anon, authenticated;
