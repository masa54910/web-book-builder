-- Gate 5: account settings and analytics dimensions

create table if not exists public.profile_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email_notifications boolean not null default true,
  campaign_notifications boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists profile_preferences_set_updated_at on public.profile_preferences;
create trigger profile_preferences_set_updated_at before update on public.profile_preferences
for each row execute function public.set_updated_at();

alter table public.profile_preferences enable row level security;

create policy "profile_preferences_select_own" on public.profile_preferences
for select using (auth.uid() = user_id);

create policy "profile_preferences_insert_own" on public.profile_preferences
for insert with check (auth.uid() = user_id);

create policy "profile_preferences_update_own" on public.profile_preferences
for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "profile_preferences_delete_own" on public.profile_preferences
for delete using (auth.uid() = user_id);

alter table public.book_analytics_events
  add column if not exists referrer_source text,
  add column if not exists device_type text check (device_type in ('pc', 'smartphone', 'tablet', 'unknown'));

create index if not exists analytics_events_book_referrer_idx
  on public.book_analytics_events(book_id, referrer_source);

create index if not exists analytics_events_book_device_idx
  on public.book_analytics_events(book_id, device_type);
