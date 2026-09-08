import assert from "node:assert/strict";

import { planBillingStateForInvoicePaymentFailed, planBillingStateForSubscriptionStatus } from "../src/lib/planBillingState";

for (const status of ["active", "trialing"] as const) {
  assert.deepEqual(planBillingStateForSubscriptionStatus(status), { transactionStatus: "paid", entitlementStatus: "active" });
}
assert.deepEqual(planBillingStateForInvoicePaymentFailed(), { transactionStatus: "failed", entitlementStatus: "past_due" });
assert.deepEqual(planBillingStateForSubscriptionStatus("past_due"), { transactionStatus: "failed", entitlementStatus: "past_due" });
assert.deepEqual(planBillingStateForSubscriptionStatus("incomplete"), { transactionStatus: "failed", entitlementStatus: "past_due" });
assert.deepEqual(planBillingStateForSubscriptionStatus("paused"), { transactionStatus: "failed", entitlementStatus: "past_due" });
assert.deepEqual(planBillingStateForSubscriptionStatus("unpaid"), { transactionStatus: "failed", entitlementStatus: "expired" });
assert.deepEqual(planBillingStateForSubscriptionStatus("incomplete_expired"), { transactionStatus: "canceled", entitlementStatus: "expired" });
assert.deepEqual(planBillingStateForSubscriptionStatus("canceled"), { transactionStatus: "canceled", entitlementStatus: "canceled" });

console.log("Plan entitlement lifecycle verification passed.");
