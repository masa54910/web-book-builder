-- Gate30-33: keep quota consumption server-only.
-- No tables, rows, or existing user data are modified.
revoke all on function public.consume_ai_book_designer_quota(uuid, integer)
  from public, anon, authenticated;

grant execute on function public.consume_ai_book_designer_quota(uuid, integer)
  to service_role;
