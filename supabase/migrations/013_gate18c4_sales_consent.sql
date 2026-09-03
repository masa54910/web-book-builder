-- Gate 18-C4: seller paid-sales consent, server-controlled.
-- Forward-only additive schema. No legacy purchase or sales row is changed.

create table if not exists public.author_sales_consents (
  user_id uuid primary key references auth.users(id) on delete cascade,
  terms_version text not null check (char_length(terms_version) between 1 and 64),
  accepted_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$
begin
  if not exists (
    select 1 from pg_trigger
    where tgname = 'author_sales_consents_set_updated_at'
      and tgrelid = 'public.author_sales_consents'::regclass
  ) then
    create trigger author_sales_consents_set_updated_at
      before update on public.author_sales_consents
      for each row execute procedure public.set_updated_at();
  end if;
end
$$;

alter table public.author_sales_consents enable row level security;
revoke all on table public.author_sales_consents from anon, authenticated;
