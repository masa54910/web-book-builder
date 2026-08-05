-- Gate 7: production persistence repair
--
-- This migration is intentionally idempotent so it can be applied safely to an
-- existing project whose books table already exists.  The editor treats the
-- BookProject JSON as the source of truth, while these two tables keep image
-- and external-link rows queryable by the dashboard and public reader.

begin;

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

create table if not exists public.book_images (
  id uuid primary key default gen_random_uuid(),
  book_id uuid not null references public.books(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  image_key text not null,
  storage_path text not null,
  caption text not null default '',
  chapter_id text not null default '',
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (book_id, image_key)
);

alter table public.book_images add column if not exists owner_id uuid;
alter table public.book_images add column if not exists image_key text;
alter table public.book_images add column if not exists storage_path text;
alter table public.book_images add column if not exists caption text not null default '';
alter table public.book_images add column if not exists chapter_id text not null default '';
alter table public.book_images add column if not exists sort_order integer not null default 0;
alter table public.book_images add column if not exists created_at timestamptz not null default now();
alter table public.book_images add column if not exists updated_at timestamptz not null default now();

create index if not exists book_images_book_sort_idx
  on public.book_images(book_id, sort_order, created_at);
create index if not exists book_images_owner_idx
  on public.book_images(owner_id);

create table if not exists public.book_external_links (
  id uuid primary key default gen_random_uuid(),
  book_id uuid not null references public.books(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  label text not null,
  description text not null default '',
  url text not null,
  link_type text not null default 'other',
  sort_order integer not null default 0,
  is_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.book_external_links add column if not exists description text not null default '';
alter table public.book_external_links add column if not exists link_type text not null default 'other';
alter table public.book_external_links add column if not exists sort_order integer not null default 0;
alter table public.book_external_links add column if not exists is_enabled boolean not null default true;
alter table public.book_external_links add column if not exists created_at timestamptz not null default now();
alter table public.book_external_links add column if not exists updated_at timestamptz not null default now();

create index if not exists book_external_links_book_sort_idx
  on public.book_external_links(book_id, sort_order, created_at);
create index if not exists book_external_links_owner_idx
  on public.book_external_links(owner_id);

drop trigger if exists book_images_set_updated_at on public.book_images;
create trigger book_images_set_updated_at
before update on public.book_images
for each row execute function public.set_updated_at();

drop trigger if exists book_external_links_set_updated_at on public.book_external_links;
create trigger book_external_links_set_updated_at
before update on public.book_external_links
for each row execute function public.set_updated_at();

alter table public.book_images enable row level security;
alter table public.book_external_links enable row level security;

drop policy if exists book_images_select_own on public.book_images;
create policy book_images_select_own on public.book_images
for select using (auth.uid() = owner_id);

drop policy if exists book_images_select_published on public.book_images;
create policy book_images_select_published on public.book_images
for select using (
  exists (
    select 1 from public.books
    where books.id = book_images.book_id
      and books.status = 'published'
      and books.visibility in ('public', 'unlisted')
      and books.deleted_at is null
  )
);

drop policy if exists book_images_insert_own on public.book_images;
create policy book_images_insert_own on public.book_images
for insert with check (auth.uid() = owner_id);

drop policy if exists book_images_update_own on public.book_images;
create policy book_images_update_own on public.book_images
for update using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

drop policy if exists book_images_delete_own on public.book_images;
create policy book_images_delete_own on public.book_images
for delete using (auth.uid() = owner_id);

drop policy if exists book_external_links_select_own on public.book_external_links;
create policy book_external_links_select_own on public.book_external_links
for select using (auth.uid() = owner_id);

drop policy if exists book_external_links_select_published on public.book_external_links;
create policy book_external_links_select_published on public.book_external_links
for select using (
  is_enabled = true and exists (
    select 1 from public.books
    where books.id = book_external_links.book_id
      and books.status = 'published'
      and books.visibility in ('public', 'unlisted')
      and books.deleted_at is null
  )
);

drop policy if exists book_external_links_insert_own on public.book_external_links;
create policy book_external_links_insert_own on public.book_external_links
for insert with check (auth.uid() = owner_id);

drop policy if exists book_external_links_update_own on public.book_external_links;
create policy book_external_links_update_own on public.book_external_links
for update using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

drop policy if exists book_external_links_delete_own on public.book_external_links;
create policy book_external_links_delete_own on public.book_external_links
for delete using (auth.uid() = owner_id);

grant select, insert, update, delete on public.book_images to authenticated;
grant select on public.book_images to anon;
grant select, insert, update, delete on public.book_external_links to authenticated;
grant select on public.book_external_links to anon;
grant select, insert, update, delete on public.books to authenticated;
grant select on public.books to anon;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'book-assets',
  'book-assets',
  false,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  name = excluded.name,
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists book_assets_select_owner_or_published on storage.objects;
create policy book_assets_select_owner_or_published on storage.objects
for select using (
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

drop policy if exists book_assets_insert_owner on storage.objects;
create policy book_assets_insert_owner on storage.objects
for insert with check (
  bucket_id = 'book-assets'
  and auth.uid()::text = (storage.foldername(name))[2]
);

drop policy if exists book_assets_update_owner on storage.objects;
create policy book_assets_update_owner on storage.objects
for update using (
  bucket_id = 'book-assets'
  and auth.uid()::text = (storage.foldername(name))[2]
)
with check (
  bucket_id = 'book-assets'
  and auth.uid()::text = (storage.foldername(name))[2]
);

drop policy if exists book_assets_delete_owner on storage.objects;
create policy book_assets_delete_owner on storage.objects
for delete using (
  bucket_id = 'book-assets'
  and auth.uid()::text = (storage.foldername(name))[2]
);

commit;
