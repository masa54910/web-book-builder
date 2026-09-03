-- Gate 18-C1: seller and Stripe Connect registry foundation.
-- Forward-only, additive schema. Stripe API calls and existing sales tables
-- are intentionally out of scope for this migration.

create table if not exists public.author_seller_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  seller_type text not null check (seller_type in ('individual', 'company')),
  legal_name text not null default '' check (char_length(legal_name) <= 240),
  trade_name text not null default '' check (char_length(trade_name) <= 240),
  representative_name text not null default '' check (char_length(representative_name) <= 240),
  country_code text not null default 'JP' check (country_code ~ '^[A-Z]{2}$'),
  postal_code text not null default '' check (char_length(postal_code) <= 32),
  region text not null default '' check (char_length(region) <= 120),
  city text not null default '' check (char_length(city) <= 120),
  address_line1 text not null default '' check (char_length(address_line1) <= 240),
  address_line2 text not null default '' check (char_length(address_line2) <= 240),
  phone text not null default '' check (char_length(phone) <= 64),
  support_email text not null default '' check (char_length(support_email) <= 320),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.author_stripe_accounts (
  user_id uuid not null references auth.users(id) on delete cascade,
  stripe_livemode boolean not null,
  stripe_account_id text not null check (stripe_account_id ~ '^acct_[A-Za-z0-9]+$'),
  account_api_version text not null default 'v2' check (account_api_version = 'v2'),
  onboarding_status text not null default 'not_started' check (onboarding_status in ('not_started', 'pending', 'complete', 'restricted')),
  merchant_status text not null default 'unknown' check (merchant_status in ('unknown', 'pending', 'active', 'restricted')),
  charges_enabled boolean not null default false,
  payouts_enabled boolean not null default false,
  requirements_status text not null default 'unknown' check (requirements_status in ('unknown', 'pending', 'complete', 'restricted')),
  last_synced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, stripe_livemode),
  unique (stripe_account_id, stripe_livemode)
);

create index if not exists author_stripe_accounts_account_idx
  on public.author_stripe_accounts(stripe_account_id, stripe_livemode);

do $$
begin
  if not exists (
    select 1 from pg_trigger
    where tgname = 'author_seller_profiles_set_updated_at'
      and tgrelid = 'public.author_seller_profiles'::regclass
  ) then
    create trigger author_seller_profiles_set_updated_at
      before update on public.author_seller_profiles
      for each row execute procedure public.set_updated_at();
  end if;
  if not exists (
    select 1 from pg_trigger
    where tgname = 'author_stripe_accounts_set_updated_at'
      and tgrelid = 'public.author_stripe_accounts'::regclass
  ) then
    create trigger author_stripe_accounts_set_updated_at
      before update on public.author_stripe_accounts
      for each row execute procedure public.set_updated_at();
  end if;
end
$$;

alter table public.author_seller_profiles enable row level security;
alter table public.author_stripe_accounts enable row level security;

-- Seller PII is owner-only. The later server API must still authenticate the
-- caller before invoking the admin repository.
revoke all on table public.author_seller_profiles from anon;
revoke all on table public.author_seller_profiles from authenticated;
grant select, insert, update, delete on table public.author_seller_profiles to authenticated;

create policy author_seller_profiles_select_owner
  on public.author_seller_profiles for select
  using (auth.uid() = user_id);

create policy author_seller_profiles_insert_owner
  on public.author_seller_profiles for insert
  with check (auth.uid() = user_id);

create policy author_seller_profiles_update_owner
  on public.author_seller_profiles for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy author_seller_profiles_delete_owner
  on public.author_seller_profiles for delete
  using (auth.uid() = user_id);

-- Registry writes are server-controlled. Authenticated users can read only
-- their own normalized connection status; anon has no table privileges.
revoke all on table public.author_stripe_accounts from anon;
revoke all on table public.author_stripe_accounts from authenticated;
grant select on table public.author_stripe_accounts to authenticated;

create policy author_stripe_accounts_select_owner
  on public.author_stripe_accounts for select
  using (auth.uid() = user_id);
