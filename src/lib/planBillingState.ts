export type PlanEntitlementStatus = "active" | "past_due" | "canceled" | "expired";
export type PlanTransactionLifecycleStatus = "paid" | "failed" | "canceled";

export type StripeSubscriptionLifecycleStatus =
  | "active"
  | "trialing"
  | "past_due"
  | "unpaid"
  | "canceled"
  | "incomplete"
  | "incomplete_expired"
  | "paused";

export type PlanBillingState = {
  transactionStatus: PlanTransactionLifecycleStatus;
  entitlementStatus: PlanEntitlementStatus;
};

/** Only paid/trialing subscriptions may retain an active entitlement. */
export function planBillingStateForSubscriptionStatus(status: StripeSubscriptionLifecycleStatus): PlanBillingState {
  if (status === "active" || status === "trialing") {
    return { transactionStatus: "paid", entitlementStatus: "active" };
  }
  if (status === "canceled") {
    return { transactionStatus: "canceled", entitlementStatus: "canceled" };
  }
  if (status === "unpaid" || status === "incomplete_expired") {
    return { transactionStatus: status === "incomplete_expired" ? "canceled" : "failed", entitlementStatus: "expired" };
  }
  return { transactionStatus: "failed", entitlementStatus: "past_due" };
}

export function planBillingStateForInvoicePaymentFailed(): PlanBillingState {
  return { transactionStatus: "failed", entitlementStatus: "past_due" };
}
