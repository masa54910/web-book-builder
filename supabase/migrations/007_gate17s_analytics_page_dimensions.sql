-- Gate 17-S Phase S-F: additive Reader page analytics dimensions.
-- Kept after the existing Gate C 006 migration so migration version numbers
-- remain unique. Source-control only in this phase; do not apply to Production yet.
alter table public.book_analytics_events
  add column if not exists publication_revision integer,
  add column if not exists reader_page_id text,
  add column if not exists source_block_id text,
  add column if not exists chapter_id text,
  add column if not exists link_type text;

alter table public.book_analytics_events
  drop constraint if exists book_analytics_events_event_type_check;

alter table public.book_analytics_events
  add constraint book_analytics_events_event_type_check
  check (event_type in ('view_start', 'reached_25', 'reached_50', 'reached_75', 'completed', 'share_click', 'external_link_click', 'chapter_reached', 'page_reached', 'paywall_reached'));

alter table public.book_analytics_events enable row level security;

-- New events enter through the server validation route. Keep the owner SELECT
-- policy for the dashboard, but prevent a browser's anon/authenticated client
-- from bypassing page/source membership checks with a direct table insert.
revoke insert on table public.book_analytics_events from anon, authenticated;

create index if not exists analytics_events_book_reader_page_idx
  on public.book_analytics_events(book_id, reader_page_id);

create index if not exists analytics_events_book_revision_idx
  on public.book_analytics_events(book_id, publication_revision);
