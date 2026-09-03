-- Gate 18-B4a: access codes are no longer generated for new purchases.
-- Existing purchase rows and their legacy code values remain untouched.
alter table public.book_purchases
  alter column access_code_hash drop not null,
  alter column access_code_ciphertext drop not null;
