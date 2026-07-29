# Beta metrics

Supabase SQL Editorで確認する初期KPIです。個人情報を過剰に扱わず、件数ベースで確認します。

```sql
select count(*) as registered_users from public.profiles;
select count(*) filter (where handle <> '') as profiles_with_handle from public.profiles;
select count(distinct owner_id) as users_with_books from public.books where deleted_at is null;
select count(*) as saved_books from public.books where deleted_at is null;
select count(*) as published_books from public.books where status = 'published' and deleted_at is null;
select count(distinct owner_id) as users_reached_publish from public.books where status = 'published' and deleted_at is null;
select count(*) as share_clicks from public.book_analytics_events where event_type = 'share_click';
select count(distinct book_id) as viewed_books from public.book_analytics_events where event_type = 'view_start';
select count(*) as completions from public.book_analytics_events where event_type = 'completed';
select count(*) as external_cta_clicks from public.book_analytics_events where event_type = 'external_link_click';
select count(*) as second_book_users
from (
  select owner_id
  from public.books
  where deleted_at is null
  group by owner_id
  having count(*) >= 2
) t;
```
