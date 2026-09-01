-- Gate 17-R Phase R-DB2: forward-only Analytics schema reconciliation.
--
-- This migration is intentionally independent of the historical migration
-- ledger. It is safe for the current Production baseline (where the
-- Analytics event table is absent) and for a fresh 001..007 database (where
-- the table already exists). It never creates book_analytics_daily because
-- the current runtime does not use that legacy aggregate table.

begin;

do $$
declare
  table_exists boolean;
  column_type text;
  column_not_null boolean;
  column_default text;
  column_name text;
  expected_type text;
  constraint_text text;
  has_primary_key boolean;
  has_book_fk boolean;
  has_other_book_fk boolean;
  orphan_count bigint;
  owner_policy_qual text;
  owner_policy_check text;
begin
  table_exists := to_regclass('public.book_analytics_events') is not null;

  if not table_exists then
    create table public.book_analytics_events (
      id uuid primary key default gen_random_uuid(),
      book_id uuid not null references public.books(id) on delete cascade,
      session_id text not null
        check (char_length(session_id) between 8 and 120),
      event_type text not null
        check (event_type in (
          'view_start',
          'reached_25',
          'reached_50',
          'reached_75',
          'completed',
          'share_click',
          'external_link_click',
          'chapter_reached',
          'page_reached',
          'paywall_reached'
        )),
      chapter_title text,
      page_index integer,
      total_pages integer,
      referrer_source text,
      device_type text
        check (device_type is null or device_type in ('pc', 'smartphone', 'tablet', 'unknown')),
      publication_revision integer,
      reader_page_id text,
      source_block_id text,
      chapter_id text,
      link_type text,
      created_at timestamptz not null default now()
    );
  else
    -- Existing tables are never dropped or recreated. Core mismatches fail
    -- loudly so a partial/foreign schema cannot be reported as success.
    for column_name, expected_type in
      select * from (values
        ('id', 'uuid'),
        ('book_id', 'uuid'),
        ('session_id', 'text'),
        ('event_type', 'text'),
        ('created_at', 'timestamp with time zone')
      ) as required_columns(name, type_name)
    loop
      select format_type(a.atttypid, a.atttypmod), a.attnotnull,
             pg_get_expr(d.adbin, d.adrelid)
        into column_type, column_not_null, column_default
      from pg_attribute a
      left join pg_attrdef d on d.adrelid = a.attrelid and d.adnum = a.attnum
      where a.attrelid = 'public.book_analytics_events'::regclass
        and a.attname = column_name
        and not a.attisdropped;

      if column_type is null then
        raise exception 'analytics schema mismatch: missing core column %', column_name;
      end if;
      if column_type <> expected_type then
        raise exception 'analytics schema mismatch: column % has type %, expected %',
          column_name, column_type, expected_type;
      end if;
      if column_name in ('id', 'book_id', 'session_id', 'event_type', 'created_at')
         and not column_not_null then
        raise exception 'analytics schema mismatch: core column % must be NOT NULL', column_name;
      end if;
      if column_name = 'id' and coalesce(column_default, '') !~ 'gen_random_uuid' then
        raise exception 'analytics schema mismatch: id default must use gen_random_uuid()';
      end if;
      if column_name = 'created_at' and coalesce(column_default, '') !~ 'now\(\)' then
        raise exception 'analytics schema mismatch: created_at default must use now()';
      end if;
    end loop;

    select exists (
      select 1
      from pg_constraint c
      where c.conrelid = 'public.book_analytics_events'::regclass
        and c.contype = 'p'
        and c.conkey = array[
          (select a.attnum from pg_attribute a
           where a.attrelid = 'public.book_analytics_events'::regclass
             and a.attname = 'id' and not a.attisdropped)
        ]::smallint[]
    ) into has_primary_key;
    if not has_primary_key then
      raise exception 'analytics schema mismatch: id primary key is missing';
    end if;

    select exists (
      select 1
      from pg_constraint c
      where c.conrelid = 'public.book_analytics_events'::regclass
        and c.contype = 'f'
        and c.confrelid = 'public.books'::regclass
        and c.conkey = array[
          (select a.attnum from pg_attribute a
           where a.attrelid = 'public.book_analytics_events'::regclass
             and a.attname = 'book_id' and not a.attisdropped)
        ]::smallint[]
        and c.confkey = array[
          (select a.attnum from pg_attribute a
           where a.attrelid = 'public.books'::regclass
             and a.attname = 'id' and not a.attisdropped)
        ]::smallint[]
    ) into has_book_fk;

    select exists (
      select 1
      from pg_constraint c
      where c.conrelid = 'public.book_analytics_events'::regclass
        and c.contype = 'f'
        and c.conkey = array[
          (select a.attnum from pg_attribute a
           where a.attrelid = 'public.book_analytics_events'::regclass
             and a.attname = 'book_id' and not a.attisdropped)
        ]::smallint[]
        and (c.confrelid <> 'public.books'::regclass or c.confdeltype <> 'c')
    ) into has_other_book_fk;
    if has_other_book_fk then
      raise exception 'analytics schema mismatch: book_id references an unexpected table';
    end if;

    if not has_book_fk then
      select count(*) into orphan_count
      from public.book_analytics_events e
      where not exists (select 1 from public.books b where b.id = e.book_id);
      if orphan_count > 0 then
        raise exception 'analytics schema mismatch: % orphan book_id values prevent FK creation', orphan_count;
      end if;
      alter table public.book_analytics_events
        add constraint book_analytics_events_book_id_fkey
        foreign key (book_id) references public.books(id) on delete cascade;
    end if;

    -- Dimensions are nullable by design for legacy rows. Existing columns
    -- are type-checked before ADD COLUMN IF NOT EXISTS can leave a mismatch.
    for column_name, expected_type in
      select * from (values
        ('chapter_title', 'text'),
        ('page_index', 'integer'),
        ('total_pages', 'integer'),
        ('referrer_source', 'text'),
        ('device_type', 'text'),
        ('publication_revision', 'integer'),
        ('reader_page_id', 'text'),
        ('source_block_id', 'text'),
        ('chapter_id', 'text'),
        ('link_type', 'text')
      ) as dimensions(name, type_name)
    loop
      select format_type(a.atttypid, a.atttypmod), a.attnotnull,
             pg_get_expr(d.adbin, d.adrelid)
        into column_type, column_not_null, column_default
      from pg_attribute a
      left join pg_attrdef d on d.adrelid = a.attrelid and d.adnum = a.attnum
      where a.attrelid = 'public.book_analytics_events'::regclass
        and a.attname = column_name
        and not a.attisdropped;
      if column_type is not null and column_type <> expected_type then
        raise exception 'analytics schema mismatch: dimension % has type %, expected %',
          column_name, column_type, expected_type;
      end if;
      if column_type is not null and column_not_null then
        raise exception 'analytics schema mismatch: dimension % must remain nullable', column_name;
      end if;
    end loop;

    -- An old event constraint that does not allow the current runtime events
    -- is a hard mismatch; do not silently replace it or discard data.
    select string_agg(pg_get_constraintdef(c.oid), ' ')
      into constraint_text
    from pg_constraint c
    where c.conrelid = 'public.book_analytics_events'::regclass
      and c.contype = 'c';
    if constraint_text is null
       or constraint_text !~ 'view_start'
       or constraint_text !~ 'reached_25'
       or constraint_text !~ 'reached_50'
       or constraint_text !~ 'reached_75'
       or constraint_text !~ 'completed'
       or constraint_text !~ 'share_click'
       or constraint_text !~ 'external_link_click'
       or constraint_text !~ 'chapter_reached'
       or constraint_text !~ 'page_reached'
       or constraint_text !~ 'paywall_reached' then
      raise exception 'analytics schema mismatch: event_type check does not match runtime allow-list';
    end if;

    alter table public.book_analytics_events
      add column if not exists chapter_title text,
      add column if not exists page_index integer,
      add column if not exists total_pages integer,
      add column if not exists referrer_source text,
      add column if not exists device_type text,
      add column if not exists publication_revision integer,
      add column if not exists reader_page_id text,
      add column if not exists source_block_id text,
      add column if not exists chapter_id text,
      add column if not exists link_type text;

    select string_agg(pg_get_constraintdef(c.oid), ' ')
      into constraint_text
    from pg_constraint c
    where c.conrelid = 'public.book_analytics_events'::regclass
      and c.contype = 'c'
      and pg_get_constraintdef(c.oid) ~* 'device_type';
    if constraint_text is null then
      alter table public.book_analytics_events
        add constraint book_analytics_events_device_type_check
        check (device_type is null or device_type in ('pc', 'smartphone', 'tablet', 'unknown'));
    elsif constraint_text !~* 'pc'
       or constraint_text !~* 'smartphone'
       or constraint_text !~* 'tablet'
       or constraint_text !~* 'unknown' then
      raise exception 'analytics schema mismatch: device_type check does not match runtime allow-list';
    end if;
  end if;
end;
$$;

create index if not exists analytics_events_book_created_idx
  on public.book_analytics_events(book_id, created_at desc);
create index if not exists analytics_events_book_type_idx
  on public.book_analytics_events(book_id, event_type);
create index if not exists analytics_events_book_referrer_idx
  on public.book_analytics_events(book_id, referrer_source);
create index if not exists analytics_events_book_device_idx
  on public.book_analytics_events(book_id, device_type);
create index if not exists analytics_events_book_reader_page_idx
  on public.book_analytics_events(book_id, reader_page_id);
create index if not exists analytics_events_book_revision_idx
  on public.book_analytics_events(book_id, publication_revision);

alter table public.book_analytics_events enable row level security;

do $$
declare
  owner_policy_qual text;
  owner_policy_check text;
begin
  select qual, with_check
    into owner_policy_qual, owner_policy_check
  from pg_policies
  where schemaname = 'public'
    and tablename = 'book_analytics_events'
    and policyname = 'analytics_events_select_owner';

  if owner_policy_qual is null then
    create policy analytics_events_select_owner
      on public.book_analytics_events
      for select
      using (
        exists (
          select 1 from public.books
          where books.id = book_analytics_events.book_id
            and books.owner_id = auth.uid()
        )
      );
  elsif owner_policy_qual !~ 'auth\.uid\(\)' or owner_policy_qual !~ 'owner_id' then
    raise exception 'analytics schema mismatch: owner SELECT policy is not ownership-scoped';
  end if;

  -- Existing INSERT policies become inert for browser roles once the
  -- privilege is revoked. Service-role inserts remain available server-side.
  revoke insert on table public.book_analytics_events from anon, authenticated;
end;
$$;

commit;
