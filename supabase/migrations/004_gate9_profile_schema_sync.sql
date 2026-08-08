-- Gate 9: forward-only profile schema synchronization
--
-- Production currently has a partial profiles table, but does not have the
-- profile columns used by the settings and author-page flows.  This migration
-- only adds missing structures.  It never drops tables/columns, truncates
-- rows, rewrites identifiers, or disables RLS.
--
-- Email is intentionally Auth-only.  The public profiles row must not be a
-- second public-facing email store; the client keeps the Auth email for the
-- read-only settings field.

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

-- The existing profiles table is preserved.  New profile fields are nullable
-- or defaulted so existing rows remain readable during the rollout.
alter table public.profiles
  add column if not exists handle text,
  add column if not exists bio text not null default '',
  add column if not exists avatar_path text not null default '',
  add column if not exists website_url text not null default '',
  add column if not exists is_public boolean not null default true,
  add column if not exists created_at timestamptz not null default now();

-- Production's current schema names these equivalent values handle_name and
-- avatar_url.  Preserve those columns for backwards compatibility, while
-- copying their existing values into the canonical fields before adding the
-- canonical handle index.  Empty canonical values are never overwritten. The
-- column checks keep this migration portable to databases that already use
-- the canonical names from 001_initial_beta_schema.sql.
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'profiles'
      and column_name = 'handle_name'
  ) then
    execute $sql$
      update public.profiles
      set handle = lower(btrim(handle_name))
      where (handle is null or btrim(handle) = '')
        and handle_name is not null
        and btrim(handle_name) <> ''
    $sql$;
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'profiles'
      and column_name = 'avatar_url'
  ) then
    execute $sql$
      update public.profiles
      set avatar_path = avatar_url
      where (avatar_path is null or btrim(avatar_path) = '')
        and avatar_url is not null
        and btrim(avatar_url) <> ''
    $sql$;
  end if;
end;
$$;

-- Never silently choose between duplicate author URLs.  If an existing
-- duplicate handle is found, the migration stops before the unique index is
-- created so an operator can repair the data explicitly.
do $$
begin
  if exists (
    select lower(btrim(handle))
    from public.profiles
    where handle is not null and btrim(handle) <> ''
    group by lower(btrim(handle))
    having count(*) > 1
  ) then
    raise exception 'Gate9 profile handle duplicates must be repaired before schema sync';
  end if;
end;
$$;

create unique index if not exists profiles_handle_unique_idx
  on public.profiles (lower(btrim(handle)))
  where handle is not null and btrim(handle) <> '';

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.profiles'::regclass
      and conname = 'profiles_handle_format_check'
  ) then
    alter table public.profiles
      add constraint profiles_handle_format_check
      check (
        handle is null
        or handle = ''
        or handle ~ '^[a-z0-9][a-z0-9_-]{1,39}$'
      ) not valid;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.profiles'::regclass
      and conname = 'profiles_bio_length_check'
  ) then
    alter table public.profiles
      add constraint profiles_bio_length_check
      check (bio is null or char_length(bio) <= 2000) not valid;
  end if;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;

drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own on public.profiles
for select using (auth.uid() = id);

drop policy if exists profiles_select_public on public.profiles;
create policy profiles_select_public on public.profiles
for select using (is_public = true);

drop policy if exists profiles_insert_own on public.profiles;
create policy profiles_insert_own on public.profiles
for insert with check (auth.uid() = id);

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles
for update using (auth.uid() = id) with check (auth.uid() = id);

grant select, insert, update, delete on public.profiles to authenticated;
grant select on public.profiles to anon;

-- Author links are owned by the Auth user and are readable publicly only when
-- the corresponding author profile is public.
create table if not exists public.author_links (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  label text not null,
  url text not null,
  link_type text not null default 'other',
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.author_links
  add column if not exists owner_id uuid,
  add column if not exists label text,
  add column if not exists url text,
  add column if not exists link_type text not null default 'other',
  add column if not exists sort_order integer not null default 0,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.author_links'::regclass
      and conname = 'author_links_url_https_check'
  ) then
    alter table public.author_links
      add constraint author_links_url_https_check
      check (url is null or url ~ '^https://') not valid;
  end if;
end;
$$;

create index if not exists author_links_owner_sort_idx
  on public.author_links(owner_id, sort_order, created_at);

drop trigger if exists author_links_set_updated_at on public.author_links;
create trigger author_links_set_updated_at
before update on public.author_links
for each row execute function public.set_updated_at();

alter table public.author_links enable row level security;

drop policy if exists author_links_select_own on public.author_links;
create policy author_links_select_own on public.author_links
for select using (auth.uid() = owner_id);

drop policy if exists author_links_select_public on public.author_links;
create policy author_links_select_public on public.author_links
for select using (
  exists (
    select 1
    from public.profiles
    where profiles.id = author_links.owner_id
      and profiles.is_public = true
  )
);

drop policy if exists author_links_insert_own on public.author_links;
create policy author_links_insert_own on public.author_links
for insert with check (auth.uid() = owner_id);

drop policy if exists author_links_update_own on public.author_links;
create policy author_links_update_own on public.author_links
for update using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

drop policy if exists author_links_delete_own on public.author_links;
create policy author_links_delete_own on public.author_links
for delete using (auth.uid() = owner_id);

grant select, insert, update, delete on public.author_links to authenticated;
grant select on public.author_links to anon;

-- Notification preferences are private to the owning Auth user.
create table if not exists public.profile_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email_notifications boolean not null default true,
  campaign_notifications boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profile_preferences
  add column if not exists email_notifications boolean not null default true,
  add column if not exists campaign_notifications boolean not null default false,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

drop trigger if exists profile_preferences_set_updated_at on public.profile_preferences;
create trigger profile_preferences_set_updated_at
before update on public.profile_preferences
for each row execute function public.set_updated_at();

alter table public.profile_preferences enable row level security;

drop policy if exists profile_preferences_select_own on public.profile_preferences;
create policy profile_preferences_select_own on public.profile_preferences
for select using (auth.uid() = user_id);

drop policy if exists profile_preferences_insert_own on public.profile_preferences;
create policy profile_preferences_insert_own on public.profile_preferences
for insert with check (auth.uid() = user_id);

drop policy if exists profile_preferences_update_own on public.profile_preferences;
create policy profile_preferences_update_own on public.profile_preferences
for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists profile_preferences_delete_own on public.profile_preferences;
create policy profile_preferences_delete_own on public.profile_preferences
for delete using (auth.uid() = user_id);

grant select, insert, update, delete on public.profile_preferences to authenticated;

-- Avatar storage is also forward-only.  Existing objects are untouched.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'profile-assets',
  'profile-assets',
  false,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do nothing;

drop policy if exists profile_assets_select_public_or_owner on storage.objects;
create policy profile_assets_select_public_or_owner
on storage.objects for select
using (
  bucket_id = 'profile-assets'
  and (
    auth.uid()::text = (storage.foldername(name))[2]
    or exists (
      select 1
      from public.profiles
      where profiles.id::text = (storage.foldername(name))[2]
        and profiles.is_public = true
    )
  )
);

drop policy if exists profile_assets_insert_owner on storage.objects;
create policy profile_assets_insert_owner
on storage.objects for insert
with check (
  bucket_id = 'profile-assets'
  and auth.uid()::text = (storage.foldername(name))[2]
);

commit;
