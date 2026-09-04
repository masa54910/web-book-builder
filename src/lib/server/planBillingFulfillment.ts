import "server-only";

import type Stripe from "stripe";
import { configuredPlanPriceId, isPlanCode, PLAN_DEFINITIONS } from "@/lib/planBilling";
import { expectedStripeLivemode } from "@/lib/server/stripeEnvironment";
import { requireStripeClient } from "@/lib/server/stripe";
import { findPaidPublication, findPlanTransactionBySubscription, insertOrUpdatePlanFulfillment, setPlanEntitlementStatus, updatePlanSubscriptionState, upsertPlanEntitlement, type PlanTransaction } from "@/lib/server/planBillingRepository";

export class PlanBillingError extends Error {
  code: "invalid_session" | "not_paid" | "wrong_plan" | "wrong_user" | "wrong_price" | "wrong_amount" | "wrong_currency" | "wrong_mode" | "already_entitled";
  constructor(code: PlanBillingError["code"]) { super(code); this.name = "PlanBillingError"; this.code = code; }
}

function priceFromSession(session: Stripe.Checkout.Session) {
  const item = session.line_items?.data[0];
  const price = item?.price;
  if (!price || typeof price === "string") throw new PlanBillingError("wrong_price");
  return price;
}

function subscriptionId(session: Stripe.Checkout.Session) {
  return typeof session.subscription === "string" ? session.subscription : session.subscription?.id || null;
}

function customerId(session: Stripe.Checkout.Session) {
  return typeof session.customer === "string" ? session.customer : session.customer?.id || null;
}

export async function fulfillPlanCheckoutSession(sessionId: string, authenticatedUserId?: string, expectedEventLivemode?: boolean) {
  const stripe = requireStripeClient();
  const expectedLive = expectedEventLivemode ?? expectedStripeLivemode();
  const session = await stripe.checkout.sessions.retrieve(sessionId, { expand: ["line_items.data.price", "subscription"] });
  if (session.livemode !== expectedLive) throw new PlanBillingError("wrong_mode");
  if (session.payment_status !== "paid") throw new PlanBillingError("not_paid");
  const metadata = session.metadata || {};
  const planCode = metadata.plan_code;
  if (!isPlanCode(planCode)) throw new PlanBillingError("wrong_plan");
  const userId = metadata.user_id;
  if (!userId || (authenticatedUserId && userId !== authenticatedUserId)) throw new PlanBillingError("wrong_user");
  const definition = PLAN_DEFINITIONS[planCode];
  if (session.mode !== definition.checkoutMode) throw new PlanBillingError("wrong_plan");
  const price = priceFromSession(session);
  if (price.id !== configuredPlanPriceId(planCode)) throw new PlanBillingError("wrong_price");
  if (price.unit_amount !== definition.amount) throw new PlanBillingError("wrong_amount");
  if ((price.currency || "").toLowerCase() !== definition.currency) throw new PlanBillingError("wrong_currency");
  const bookId = metadata.book_id || null;
  if (planCode === "publication" && !bookId) throw new PlanBillingError("wrong_plan");
  if (planCode === "publication" && authenticatedUserId && await findPaidPublication(authenticatedUserId, bookId!, expectedLive)) {
    const existing = await findPaidPublication(authenticatedUserId, bookId!, expectedLive);
    if (existing?.checkoutSessionId !== session.id) throw new PlanBillingError("already_entitled");
  }
  const subscriptionPeriodEnd = session.subscription && typeof session.subscription !== "string" ? session.subscription.items.data[0]?.current_period_end : null;
  const periodEnd = subscriptionPeriodEnd
    ? new Date(subscriptionPeriodEnd * 1000).toISOString()
    : null;
  const transactionInput: Omit<PlanTransaction, "id"> = {
    userId, planCode, bookId, checkoutSessionId: session.id,
    paymentIntentId: typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id || null,
    customerId: customerId(session), subscriptionId: subscriptionId(session), livemode: expectedLive,
    amount: definition.amount, currency: definition.currency, status: "paid", currentPeriodEnd: periodEnd, cancelAtPeriodEnd: false,
  };
  const transaction = await insertOrUpdatePlanFulfillment(transactionInput);
  await upsertPlanEntitlement(transaction);
  return { planCode, bookId, transactionId: transaction.id };
}

export async function handlePlanSubscriptionEvent(event: Stripe.Event, expectedEventLivemode: boolean) {
  const object = event.data.object as Stripe.Invoice | Stripe.Subscription;
  const subscriptionRef = (object as Stripe.Invoice & { subscription?: string | { id: string } | null }).subscription;
  const subscriptionId = subscriptionRef
    ? (typeof subscriptionRef === "string" ? subscriptionRef : subscriptionRef.id)
    : "items" in object ? object.id : null;
  if (!subscriptionId) return;
  const transaction = await findPlanTransactionBySubscription(subscriptionId, expectedEventLivemode);
  if (!transaction) return;
  if (event.type === "invoice.paid") {
    await upsertPlanEntitlement(await updatePlanSubscriptionState(transaction.id, "paid", transaction.currentPeriodEnd, false));
  } else if (event.type === "invoice.payment_failed") {
    await updatePlanSubscriptionState(transaction.id, "failed", transaction.currentPeriodEnd, transaction.cancelAtPeriodEnd);
  } else if (event.type === "customer.subscription.deleted") {
    const updated = await updatePlanSubscriptionState(transaction.id, "canceled", null, true);
    await setPlanEntitlementStatus(updated, "canceled");
  } else if (event.type === "customer.subscription.updated") {
    const subscription = object as Stripe.Subscription;
    const itemEnd = subscription.items.data[0]?.current_period_end;
    const status = subscription.status === "active" || subscription.status === "trialing" ? "paid" : subscription.status === "canceled" ? "canceled" : "failed";
    const updated = await updatePlanSubscriptionState(transaction.id, status, itemEnd ? new Date(itemEnd * 1000).toISOString() : null, subscription.cancel_at_period_end);
    if (status === "paid") await upsertPlanEntitlement(updated);
  }
}
