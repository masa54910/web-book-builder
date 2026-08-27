-- Gate C Phase L-1a: persist Stripe Test/Live provenance.
--
-- This migration is intentionally additive/backward-compatible with the
-- existing Sandbox rows. It does not touch books or book_project_json. The
-- Existing rows are explicitly backfilled to false; no permanent DEFAULT is
-- introduced. New purchases/settings must always provide the value explicitly
-- from Stripe's server-side livemode field.

alter table public.book_sales_settings
  add column if not exists stripe_livemode boolean;

update public.book_sales_settings
set stripe_livemode = false
where stripe_livemode is null;

alter table public.book_sales_settings
  alter column stripe_livemode set not null,
  alter column stripe_livemode drop default;

-- A book can have one Test setting and one Live setting. This changes only
-- the key definition; no rows are deleted or rewritten beyond the explicit
-- Test backfill above.
alter table public.book_sales_settings
  drop constraint if exists book_sales_settings_pkey;

alter table public.book_sales_settings
  add constraint book_sales_settings_pkey primary key (book_id, stripe_livemode);

create index if not exists book_sales_settings_book_env_idx
  on public.book_sales_settings(book_id, stripe_livemode);

alter table public.book_purchases
  add column if not exists stripe_livemode boolean;

update public.book_purchases
set stripe_livemode = false
where stripe_livemode is null;

alter table public.book_purchases
  alter column stripe_livemode set not null,
  alter column stripe_livemode drop default;

create index if not exists book_purchases_book_env_created_idx
  on public.book_purchases(book_id, stripe_livemode, created_at desc);

-- Preserve the existing owner-only policies on sales settings and the
-- server-only posture of book_purchases. RLS is re-asserted here so the
-- intended posture is explicit without creating any client policies.
alter table public.book_sales_settings enable row level security;
alter table public.book_purchases enable row level security;

revoke all on table public.book_purchases from anon, authenticated;
