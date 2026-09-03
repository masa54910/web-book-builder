-- Gate 18-C5: idempotent Connect webhook event ledger.
-- Forward-only additive schema. Event payloads and secrets are not stored.

create table if not exists public.connect_webhook_events (
  event_id text primary key check (event_id ~ '^evt_[A-Za-z0-9_]+$'),
  stripe_account_id text not null check (stripe_account_id ~ '^acct_[A-Za-z0-9]+$'),
  stripe_livemode boolean not null,
  event_type text not null check (event_type in ('checkout.session.completed', 'charge.refunded', 'charge.dispute.created')),
  processed_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists connect_webhook_events_account_idx on public.connect_webhook_events(stripe_account_id, stripe_livemode);
alter table public.connect_webhook_events enable row level security;
revoke all on table public.connect_webhook_events from anon, authenticated;
