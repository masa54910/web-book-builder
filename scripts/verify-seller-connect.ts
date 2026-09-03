import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  evaluateSellerProfileCompleteness,
  evaluateStripeSellerReadiness,
  type AuthorSellerProfileInput,
} from "../src/lib/sellerConnect";

const completeIndividual: AuthorSellerProfileInput = {
  userId: "user-1",
  sellerType: "individual",
  legalName: "本野しおり",
  tradeName: "",
  representativeName: "",
  countryCode: "JP",
  postalCode: "100-0001",
  region: "東京都",
  city: "千代田区",
  addressLine1: "1-1",
  addressLine2: "",
  phone: "03-0000-0000",
  supportEmail: "seller@example.com",
};

assert.equal(evaluateSellerProfileCompleteness(completeIndividual).complete, true);
const missingIndividual = evaluateSellerProfileCompleteness({ ...completeIndividual, phone: "", supportEmail: "" });
assert.deepEqual(missingIndividual.missingFields, ["phone", "supportEmail"]);
assert.equal(evaluateSellerProfileCompleteness({ ...completeIndividual, sellerType: "company", representativeName: "" }).complete, false);
assert.equal(evaluateSellerProfileCompleteness({ ...completeIndividual, sellerType: "company", representativeName: "代表者" }).complete, true);
assert.equal(evaluateSellerProfileCompleteness(null).complete, false);

const ready = evaluateStripeSellerReadiness({
  userId: "user-1",
  stripeLivemode: true,
  stripeAccountId: "acct_123",
  accountApiVersion: "v2",
  onboardingStatus: "complete",
  merchantStatus: "active",
  chargesEnabled: true,
  payoutsEnabled: true,
  requirementsStatus: "complete",
  lastSyncedAt: null,
  createdAt: "",
  updatedAt: "",
});
assert.equal(ready.connected, true);
assert.equal(ready.missingRequirements.length, 0);
assert.equal(evaluateStripeSellerReadiness(null).connected, false);

const migration = readFileSync(resolve(process.cwd(), "supabase/migrations/010_gate18c1_seller_connect_foundation.sql"), "utf8");
for (const required of ["author_seller_profiles", "author_stripe_accounts", "auth.uid() = user_id", "grant select on table public.author_stripe_accounts to authenticated", "stripe_account_id, stripe_livemode"]) {
  assert.match(migration, new RegExp(required.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
}
for (const forbidden of ["secret_key", "bank_account", "card_number", "drop table", "drop column", "delete from", "update public."]) {
  assert.equal(migration.toLowerCase().includes(forbidden), false, `migration must not contain ${forbidden}`);
}

console.log("Seller / Connect foundation checks passed.");
