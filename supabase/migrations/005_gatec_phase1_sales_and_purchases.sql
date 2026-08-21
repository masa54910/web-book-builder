-- Gate C Phase 1 foundation only.
-- Payment verification, fulfillment, access-code entry, and Reader gating
-- are intentionally implemented in later steps.
--
-- The free/paid boundary is a stable PaywallBlock in the canonical document
-- (`books.book_project_json`), not a page number. Existing projects without
-- that block remain fully free. The PaywallBlock itself is implemented in a
-- later Editor gate; this migration deliberately does not add a page-boundary
-- column to the sales settings table.

create table if not exists public.book_sales_settings (
  book_id uuid primary key references public.books(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  stripe_payment_link_id text not null check (stripe_payment_link_id ~ '^plink_[A-Za-z0-9]+$'),
  stripe_price_id text not null check (stripe_price_id ~ '^price_[A-Za-z0-9]+$'),
  amount integer not null check (amount >= 0),
  currency text not null check (currency in ('jpy', 'usd')),
  enabled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (stripe_payment_link_id),
  unique (stripe_price_id)
);

create index if not exists book_sales_settings_owner_idx on public.book_sales_settings(owner_id);
create index if not exists book_sales_settings_enabled_idx on public.book_sales_settings(enabled) where enabled = true;

create table if not exists public.book_purchases (
  id uuid primary key default gen_random_uuid(),
  book_id uuid not null references public.books(id) on delete cascade,
  stripe_checkout_session_id text not null unique check (stripe_checkout_session_id ~ '^cs_[A-Za-z0-9_]+$'),
  stripe_payment_intent_id text,
  buyer_email text check (buyer_email is null or char_length(buyer_email) <= 320),
  amount integer not null check (amount >= 0),
  currency text not null check (currency in ('jpy', 'usd')),
  payment_status text not null check (payment_status in ('pending', 'paid', 'unpaid', 'no_payment_required', 'failed')),
  access_code_hash text not null check (access_code_hash ~ '^[0-9a-f]{64}$'),
  access_code_ciphertext text not null check (char_length(access_code_ciphertext) between 20 and 4096),
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists book_purchases_book_created_idx on public.book_purchases(book_id, created_at desc);
create index if not exists book_purchases_payment_intent_idx on public.book_purchases(stripe_payment_intent_id)
  where stripe_payment_intent_id is not null;

create trigger book_sales_settings_set_updated_at
before update on public.book_sales_settings
for each row execute procedure public.set_updated_at();

create trigger book_purchases_set_updated_at
before update on public.book_purchases
for each row execute procedure public.set_updated_at();

alter table public.book_sales_settings enable row level security;
alter table public.book_purchases enable row level security;

create policy "book_sales_settings_select_owner"
on public.book_sales_settings for select
using (auth.uid() = owner_id);

create policy "book_sales_settings_insert_owner"
on public.book_sales_settings for insert
with check (
  auth.uid() = owner_id
  and exists (
    select 1 from public.books
    where books.id = book_sales_settings.book_id
      and books.owner_id = auth.uid()
  )
);

create policy "book_sales_settings_update_owner"
on public.book_sales_settings for update
using (auth.uid() = owner_id)
with check (
  auth.uid() = owner_id
  and exists (
    select 1 from public.books
    where books.id = book_sales_settings.book_id
      and books.owner_id = auth.uid()
  )
);

create policy "book_sales_settings_delete_owner"
on public.book_sales_settings for delete
using (auth.uid() = owner_id);

-- Purchases are server-only in Phase 1. No anon/authenticated policy is
-- intentionally created, and direct table privileges are revoked.
revoke all on table public.book_purchases from anon, authenticated;
