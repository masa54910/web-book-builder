-- Gate 20-S: server-mediated admin reply history.
-- Additive only. Browser roles cannot access this table.

create table if not exists public.contact_inquiry_replies (
  id uuid primary key default gen_random_uuid(),
  inquiry_id uuid not null references public.contact_inquiries(id) on delete cascade,
  sender_type text not null default 'admin' check (sender_type = 'admin'),
  subject text not null check (char_length(subject) between 1 and 200),
  body text not null check (char_length(body) between 1 and 5000),
  idempotency_key text not null unique check (char_length(idempotency_key) between 16 and 128),
  send_status text not null default 'pending' check (send_status in ('pending', 'sent', 'failed')),
  provider_message_id text check (provider_message_id is null or char_length(provider_message_id) <= 255),
  sent_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists contact_inquiry_replies_inquiry_idx
  on public.contact_inquiry_replies(inquiry_id, created_at asc);

alter table public.contact_inquiry_replies enable row level security;
revoke all on table public.contact_inquiry_replies from anon, authenticated;

