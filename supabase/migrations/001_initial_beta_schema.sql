-- WebBookMaker limited beta schema
-- BookProject JSON is the source of truth for reader layout/content.
-- Relational columns are the source of truth for ownership, publication state,
-- routing, indexing, limits, and lightweight dashboard queries.

create extension if not exists "pgcrypto";

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null default '',
  display_name text not null default '',
  handle text not null unique check (handle ~ '^[a-z0-9][a-z0-9_-]{1,39}$'),
  bio text not null default '' check (char_length(bio) <= 2000),
  avatar_path text not null default '',
  website_url text not null default '',
  is_public boolean not null default true,
  role text not null default 'user' check (role in ('user', 'admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.books (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 160),
  subtitle text not null default '' check (char_length(subtitle) <= 240),
  author_name text not null check (char_length(author_name) between 1 and 120),
  author_handle text not null check (author_handle ~ '^[a-z0-9][a-z0-9_-]{1,39}$'),
  description text not null default '' check (char_length(description) <= 3000),
  publisher text not null default '',
  published_at text not null default '',
  copyright text not null default '',
  slug text not null unique check (slug ~ '^[a-z0-9][a-z0-9-]{1,78}[a-z0-9]$'),
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  visibility text not null default 'private' check (visibility in ('private', 'unlisted', 'public')),
  binding_direction text not null default 'rtl' check (binding_direction in ('rtl', 'ltr')),
  reader_mode text not null default 'book' check (reader_mode in ('book', 'scroll', 'magazine', 'photo')),
  theme text not null default 'classic' check (theme in ('classic', 'modern', 'minimal', 'magazine', 'novel', 'photo', 'research', 'portfolio')),
  characters_per_page integer not null default 380 check (characters_per_page between 180 and 1200),
  toc_items_per_page integer not null default 6 check (toc_items_per_page between 1 and 20),
  cover_path text not null default '',
  raw_text text not null default '' check (char_length(raw_text) <= 200000),
  book_project_json jsonb not null,
  version integer not null default 1 check (version >= 1),
  monetization_enabled boolean not null default false,
  monetization_mode text not null default 'none' check (monetization_mode in ('none', 'external')),
  access_level text not null default 'free' check (access_level in ('free', 'external', 'password', 'access-code')),
  price_amount integer check (price_amount is null or price_amount >= 0),
  currency text not null default 'JPY' check (currency in ('JPY', 'USD')),
  preview_mode text not null default 'none' check (preview_mode in ('none', 'chapters', 'pages', 'percent')),
  preview_value integer check (preview_value is null or preview_value >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  first_published_at timestamptz,
  last_published_at timestamptz,
  deleted_at timestamptz,
  check (status <> 'published' or visibility in ('public', 'unlisted'))
);

create index if not exists books_owner_updated_idx on public.books(owner_id, updated_at desc) where deleted_at is null;
create index if not exists books_public_slug_idx on public.books(slug) where status = 'published' and deleted_at is null;
create index if not exists books_author_handle_idx on public.books(author_handle, updated_at desc) where status = 'published' and deleted_at is null;

create table if not exists public.book_images (
  id uuid primary key default gen_random_uuid(),
  book_id uuid not null references public.books(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  image_key text not null check (image_key ~ '^[A-Za-z0-9._-]{1,80}$'),
  storage_path text not null,
  caption text not null default '' check (char_length(caption) <= 500),
  chapter_id text not null default '',
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(book_id, image_key)
);

create table if not exists public.author_links (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  label text not null check (char_length(label) between 1 and 80),
  url text not null check (url ~ '^https://'),
  link_type text not null default 'other',
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.book_external_links (
  id uuid primary key default gen_random_uuid(),
  book_id uuid not null references public.books(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  label text not null check (char_length(label) between 1 and 80),
  description text not null default '' check (char_length(description) <= 500),
  url text not null check (url ~ '^https://'),
  link_type text not null default 'other',
  sort_order integer not null default 0,
  is_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.book_analytics_events (
  id uuid primary key default gen_random_uuid(),
  book_id uuid not null references public.books(id) on delete cascade,
  session_id text not null check (char_length(session_id) between 8 and 120),
  event_type text not null check (event_type in ('view_start', 'reached_25', 'reached_50', 'reached_75', 'completed', 'share_click', 'external_link_click', 'chapter_reached')),
  chapter_title text,
  page_index integer,
  total_pages integer,
  created_at timestamptz not null default now()
);

create index if not exists analytics_events_book_created_idx on public.book_analytics_events(book_id, created_at desc);
create index if not exists analytics_events_book_type_idx on public.book_analytics_events(book_id, event_type);

create table if not exists public.book_analytics_daily (
  book_id uuid not null references public.books(id) on delete cascade,
  event_date date not null default current_date,
  views integer not null default 0,
  unique_sessions integer not null default 0,
  reached_25 integer not null default 0,
  reached_50 integer not null default 0,
  reached_75 integer not null default 0,
  completed integer not null default 0,
  share_clicks integer not null default 0,
  external_link_clicks integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (book_id, event_date)
);

create table if not exists public.reserved_handles (
  handle text primary key
);

insert into public.reserved_handles(handle)
values
  ('login'), ('signup'), ('dashboard'), ('books'), ('reader'), ('sample'),
  ('terms'), ('privacy'), ('contact'), ('api'), ('admin'), ('auth'),
  ('settings'), ('favicon.ico'), ('robots.txt'), ('sitemap.xml'), ('authors')
on conflict do nothing;

create or replace function public.reject_reserved_handle()
returns trigger
language plpgsql
as $$
begin
  if exists(select 1 from public.reserved_handles where handle = new.handle) then
    raise exception 'reserved handle';
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_reject_reserved_handle on public.profiles;
create trigger profiles_reject_reserved_handle before insert or update on public.profiles
for each row execute function public.reject_reserved_handle();

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists books_set_updated_at on public.books;
create trigger books_set_updated_at before update on public.books
for each row execute function public.set_updated_at();

drop trigger if exists book_images_set_updated_at on public.book_images;
create trigger book_images_set_updated_at before update on public.book_images
for each row execute function public.set_updated_at();

drop trigger if exists author_links_set_updated_at on public.author_links;
create trigger author_links_set_updated_at before update on public.author_links
for each row execute function public.set_updated_at();

drop trigger if exists book_external_links_set_updated_at on public.book_external_links;
create trigger book_external_links_set_updated_at before update on public.book_external_links
for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  base_handle text;
  candidate text;
  suffix integer := 1;
begin
  base_handle := lower(regexp_replace(coalesce(split_part(new.email, '@', 1), 'author'), '[^a-z0-9_-]+', '-', 'g'));
  base_handle := trim(both '-' from substring(base_handle from 1 for 32));
  if base_handle = '' then
    base_handle := 'author';
  end if;
  candidate := base_handle;
  while exists(select 1 from public.profiles where handle = candidate)
     or exists(select 1 from public.reserved_handles where handle = candidate) loop
    suffix := suffix + 1;
    candidate := substring(base_handle from 1 for 32) || '-' || suffix::text;
  end loop;

  insert into public.profiles (id, email, display_name, handle)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data ->> 'display_name', new.email, 'user'),
    candidate
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.books enable row level security;
alter table public.book_images enable row level security;
alter table public.author_links enable row level security;
alter table public.book_external_links enable row level security;
alter table public.book_analytics_events enable row level security;
alter table public.book_analytics_daily enable row level security;

create policy "profiles_select_own" on public.profiles for select using (auth.uid() = id);
create policy "profiles_select_public" on public.profiles for select using (is_public = true);
create policy "profiles_insert_own" on public.profiles for insert with check (auth.uid() = id);
create policy "profiles_update_own" on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);

create policy "books_select_own" on public.books for select using (auth.uid() = owner_id);
create policy "books_select_published" on public.books for select using (
  status = 'published' and visibility in ('public', 'unlisted') and deleted_at is null
);
create policy "books_insert_own" on public.books for insert with check (auth.uid() = owner_id);
create policy "books_update_own" on public.books for update using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

create policy "book_images_select_own" on public.book_images for select using (auth.uid() = owner_id);
create policy "book_images_select_published" on public.book_images for select using (
  exists (
    select 1 from public.books
    where books.id = book_images.book_id
      and books.status = 'published'
      and books.visibility in ('public', 'unlisted')
      and books.deleted_at is null
  )
);
create policy "book_images_insert_own" on public.book_images for insert with check (auth.uid() = owner_id);
create policy "book_images_update_own" on public.book_images for update using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
create policy "book_images_delete_own" on public.book_images for delete using (auth.uid() = owner_id);

create policy "author_links_select_own" on public.author_links for select using (auth.uid() = owner_id);
create policy "author_links_select_public" on public.author_links for select using (
  exists(select 1 from public.profiles where profiles.id = author_links.owner_id and profiles.is_public = true)
);
create policy "author_links_insert_own" on public.author_links for insert with check (auth.uid() = owner_id);
create policy "author_links_update_own" on public.author_links for update using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
create policy "author_links_delete_own" on public.author_links for delete using (auth.uid() = owner_id);

create policy "book_external_links_select_own" on public.book_external_links for select using (auth.uid() = owner_id);
create policy "book_external_links_select_public" on public.book_external_links for select using (
  is_enabled = true and exists (
    select 1 from public.books
    where books.id = book_external_links.book_id
      and books.status = 'published'
      and books.visibility in ('public', 'unlisted')
      and books.deleted_at is null
  )
);
create policy "book_external_links_insert_own" on public.book_external_links for insert with check (auth.uid() = owner_id);
create policy "book_external_links_update_own" on public.book_external_links for update using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
create policy "book_external_links_delete_own" on public.book_external_links for delete using (auth.uid() = owner_id);

create policy "analytics_events_insert_public_books" on public.book_analytics_events for insert with check (
  exists (
    select 1 from public.books
    where books.id = book_analytics_events.book_id
      and books.status = 'published'
      and books.visibility in ('public', 'unlisted')
      and books.deleted_at is null
  )
);
create policy "analytics_events_select_owner" on public.book_analytics_events for select using (
  exists(select 1 from public.books where books.id = book_analytics_events.book_id and books.owner_id = auth.uid())
);

create policy "analytics_daily_select_owner" on public.book_analytics_daily for select using (
  exists(select 1 from public.books where books.id = book_analytics_daily.book_id and books.owner_id = auth.uid())
);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('book-assets', 'book-assets', false, 10485760, array['image/jpeg', 'image/png', 'image/webp']),
  ('profile-assets', 'profile-assets', false, 10485760, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "book_assets_select_owner_or_published"
on storage.objects for select
using (
  bucket_id = 'book-assets'
  and (
    auth.uid()::text = (storage.foldername(name))[2]
    or exists (
      select 1 from public.books
      where books.owner_id::text = (storage.foldername(name))[2]
        and books.book_project_json -> 'config' ->> 'bookId' = (storage.foldername(name))[3]
        and books.status = 'published'
        and books.visibility in ('public', 'unlisted')
        and books.deleted_at is null
    )
  )
);

create policy "book_assets_insert_owner"
on storage.objects for insert
with check (
  bucket_id = 'book-assets'
  and auth.uid()::text = (storage.foldername(name))[2]
);

create policy "book_assets_update_owner"
on storage.objects for update
using (
  bucket_id = 'book-assets'
  and auth.uid()::text = (storage.foldername(name))[2]
)
with check (
  bucket_id = 'book-assets'
  and auth.uid()::text = (storage.foldername(name))[2]
);

create policy "book_assets_delete_owner"
on storage.objects for delete
using (
  bucket_id = 'book-assets'
  and auth.uid()::text = (storage.foldername(name))[2]
);

create policy "profile_assets_select_public_or_owner"
on storage.objects for select
using (
  bucket_id = 'profile-assets'
  and (
    auth.uid()::text = (storage.foldername(name))[2]
    or exists (
      select 1 from public.profiles
      where profiles.id::text = (storage.foldername(name))[2]
        and profiles.is_public = true
    )
  )
);

create policy "profile_assets_insert_owner"
on storage.objects for insert
with check (
  bucket_id = 'profile-assets'
  and auth.uid()::text = (storage.foldername(name))[2]
);
