create table if not exists public.sample_book_snapshots (
  id uuid primary key default gen_random_uuid(), sample_slug text not null,
  source_master_book_id uuid not null references public.books(id) on delete restrict,
  version integer not null, snapshot_json jsonb not null, is_active boolean not null default true,
  created_at timestamptz not null default now(), created_by uuid not null references auth.users(id) on delete restrict,
  superseded_at timestamptz, unique(sample_slug, version)
);
create unique index if not exists sample_book_snapshots_active_idx on public.sample_book_snapshots(sample_slug) where is_active;
alter table public.sample_book_snapshots enable row level security;
revoke all on public.sample_book_snapshots from anon, authenticated;
