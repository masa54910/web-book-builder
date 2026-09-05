-- Gate 20: server-mediated support inquiries.
-- Additive only. The table is not exposed to anon/authenticated clients.

create table if not exists public.contact_inquiries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  name text not null check (char_length(name) between 1 and 120),
  reply_email text not null check (char_length(reply_email) between 3 and 254),
  category text not null check (category in ('usage', 'pricing', 'payment', 'book_purchase', 'account', 'technical', 'other')),
  message text not null check (char_length(message) between 1 and 5000),
  status text not null default 'new' check (status in ('new', 'in_progress', 'resolved', 'spam')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists contact_inquiries_created_idx
  on public.contact_inquiries(created_at desc);

create index if not exists contact_inquiries_user_idx
  on public.contact_inquiries(user_id, created_at desc);

create trigger contact_inquiries_set_updated_at
before update on public.contact_inquiries
for each row execute procedure public.set_updated_at();

alter table public.contact_inquiries enable row level security;
revoke all on table public.contact_inquiries from anon, authenticated;
