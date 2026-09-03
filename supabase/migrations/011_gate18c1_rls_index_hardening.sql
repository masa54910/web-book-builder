-- Gate 18-C1a: remove one redundant index and stabilize C1 RLS InitPlans.
-- Forward-only hardening. Migration 010 and existing grants/schema are unchanged.

drop index if exists public.author_stripe_accounts_account_idx;

drop policy if exists author_seller_profiles_select_owner on public.author_seller_profiles;
create policy author_seller_profiles_select_owner
  on public.author_seller_profiles for select
  using ((select auth.uid()) = user_id);

drop policy if exists author_seller_profiles_insert_owner on public.author_seller_profiles;
create policy author_seller_profiles_insert_owner
  on public.author_seller_profiles for insert
  with check ((select auth.uid()) = user_id);

drop policy if exists author_seller_profiles_update_owner on public.author_seller_profiles;
create policy author_seller_profiles_update_owner
  on public.author_seller_profiles for update
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists author_seller_profiles_delete_owner on public.author_seller_profiles;
create policy author_seller_profiles_delete_owner
  on public.author_seller_profiles for delete
  using ((select auth.uid()) = user_id);

drop policy if exists author_stripe_accounts_select_owner on public.author_stripe_accounts;
create policy author_stripe_accounts_select_owner
  on public.author_stripe_accounts for select
  using ((select auth.uid()) = user_id);
