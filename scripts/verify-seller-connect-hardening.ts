import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const migration010 = readFileSync(
  resolve(process.cwd(), "supabase/migrations/010_gate18c1_seller_connect_foundation.sql"),
  "utf8",
);
const migration011 = readFileSync(
  resolve(process.cwd(), "supabase/migrations/011_gate18c1_rls_index_hardening.sql"),
  "utf8",
);

assert.equal((migration011.match(/\bdrop\s+index\b/gi) ?? []).length, 1);
assert.match(
  migration011,
  /drop index if exists public\.author_stripe_accounts_account_idx;/i,
);
assert.doesNotMatch(
  migration011,
  /author_stripe_accounts_stripe_account_id_stripe_livemode_key/i,
);

const ownerPolicies = [
  "author_seller_profiles_select_owner",
  "author_seller_profiles_insert_owner",
  "author_seller_profiles_update_owner",
  "author_seller_profiles_delete_owner",
  "author_stripe_accounts_select_owner",
];
for (const policy of ownerPolicies) {
  assert.match(migration011, new RegExp(`drop policy if exists ${policy} on`, "i"));
  assert.match(migration011, new RegExp(`create policy ${policy}`, "i"));
}
assert.equal((migration011.match(/\bcreate\s+policy\b/gi) ?? []).length, 5);
assert.equal((migration011.match(/\(select\s+auth\.uid\(\)\)\s*=\s*user_id/gi) ?? []).length, 6);
assert.match(migration011, /with check \(\(select auth\.uid\(\)\) = user_id\)/i);

for (const forbidden of [
  /\bgrant\b/i,
  /\brevoke\b/i,
  /\balter\s+table\b/i,
  /\bcreate\s+table\b/i,
  /\bdrop\s+constraint\b/i,
  /\bdrop\s+column\b/i,
  /\btruncate\b/i,
  /\bdelete\s+from\b/i,
  /\bupdate\s+public\./i,
  /\banon\b/i,
]) {
  assert.doesNotMatch(migration011, forbidden, `011 must not contain ${forbidden}`);
}
assert.match(migration010, /revoke all on table public\.author_stripe_accounts from anon;/i);

console.log("Seller / Connect hardening checks passed.");
