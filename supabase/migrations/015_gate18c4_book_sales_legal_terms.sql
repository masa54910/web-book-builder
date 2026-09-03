-- Gate 18-C4: book-level seller terms for Connect sales disclosure.
-- Forward-only additive schema. Legacy sales and purchase rows are unchanged.

alter table public.connect_book_sales
  add column if not exists payment_method text,
  add column if not exists payment_timing text,
  add column if not exists digital_delivery_timing text,
  add column if not exists refund_policy text,
  add column if not exists additional_costs text,
  add column if not exists application_deadline text;
