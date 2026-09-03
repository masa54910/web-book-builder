-- Gate 18-C3: Connected Account direct-charge sales registry.
-- Forward-only additive schema. Legacy book_sales_settings and purchases remain unchanged.

create table if not exists public.connect_book_sales (
  id uuid primary key default gen_random_uuid(),
  book_id uuid not null references public.books(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  stripe_livemode boolean not null,
  stripe_account_id text not null check (stripe_account_id ~ '^acct_[A-Za-z0-9]+$'),
  stripe_product_id text not null check (stripe_product_id ~ '^prod_[A-Za-z0-9]+$'),
  stripe_price_id text not null check (stripe_price_id ~ '^price_[A-Za-z0-9]+$'),
  stripe_payment_link_id text not null check (stripe_payment_link_id ~ '^plink_[A-Za-z0-9]+$'),
  amount integer not null check (amount > 0),
  currency text not null check (currency in ('jpy', 'usd')),
  enabled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (book_id, stripe_livemode),
  unique (stripe_payment_link_id),
  unique (stripe_price_id)
);

create index if not exists connect_book_sales_owner_idx on public.connect_book_sales(owner_id);
create index if not exists connect_book_sales_account_idx on public.connect_book_sales(stripe_account_id, stripe_livemode);

do $$
begin
  if not exists (
    select 1 from pg_trigger
    where tgname = 'connect_book_sales_set_updated_at'
      and tgrelid = 'public.connect_book_sales'::regclass
  ) then
    create trigger connect_book_sales_set_updated_at
      before update on public.connect_book_sales
      for each row execute procedure public.set_updated_at();
  end if;
end
$$;

alter table public.connect_book_sales enable row level security;
revoke all on table public.connect_book_sales from anon, authenticated;
