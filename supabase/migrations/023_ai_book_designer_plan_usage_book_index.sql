-- Gate37: cover the book_id foreign key with a leading-column index.
create index if not exists ai_book_designer_plan_usage_book_fk_idx
  on public.ai_book_designer_plan_usage(book_id)
  where book_id is not null;
