import "server-only";

import { requireSupabaseAdminClient } from "@/lib/server/supabaseAdmin";
import type { PlanCode } from "@/lib/planBilling";

export type PlanTransaction = {
  id: string;
  userId: string;
  planCode: PlanCode;
  bookId: string | null;
  checkoutSessionId: string;
  paymentIntentId: string | null;
  customerId: string | null;
  subscriptionId: string | null;
  livemode: boolean;
  amount: number;
  currency: string;
  status: "pending" | "paid" | "failed" | "canceled";
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
};

function mapTransaction(row: Record<string, unknown>): PlanTransaction {
  return {
    id: String(row.id), userId: String(row.user_id), planCode: row.plan_code as PlanCode,
    bookId: row.book_id ? String(row.book_id) : null,
    checkoutSessionId: String(row.stripe_checkout_session_id),
    paymentIntentId: row.stripe_payment_intent_id ? String(row.stripe_payment_intent_id) : null,
    customerId: row.stripe_customer_id ? String(row.stripe_customer_id) : null,
    subscriptionId: row.stripe_subscription_id ? String(row.stripe_subscription_id) : null,
    livemode: Boolean(row.livemode), amount: Number(row.amount), currency: String(row.currency),
    status: row.status as PlanTransaction["status"],
    currentPeriodEnd: row.current_period_end ? String(row.current_period_end) : null,
    cancelAtPeriodEnd: Boolean(row.cancel_at_period_end),
  };
}

export async function findPlanTransaction(sessionId: string) {
  const { data, error } = await requireSupabaseAdminClient().from("plan_billing_transactions").select("*").eq("stripe_checkout_session_id", sessionId).maybeSingle();
  if (error) throw error;
  return data ? mapTransaction(data) : null;
}

export async function findPaidPublication(userId: string, bookId: string, livemode: boolean) {
  const { data, error } = await requireSupabaseAdminClient().from("plan_billing_transactions").select("*").eq("user_id", userId).eq("book_id", bookId).eq("plan_code", "publication").eq("livemode", livemode).eq("status", "paid").maybeSingle();
  if (error) throw error;
  return data ? mapTransaction(data) : null;
}

export async function findPlanTransactionBySubscription(subscriptionId: string, livemode: boolean) {
  const { data, error } = await requireSupabaseAdminClient().from("plan_billing_transactions").select("*").eq("stripe_subscription_id", subscriptionId).eq("livemode", livemode).maybeSingle();
  if (error) throw error;
  return data ? mapTransaction(data) : null;
}

export async function findActiveOperationPlanForUser(userId: string, livemode: boolean) {
  const { data, error } = await requireSupabaseAdminClient()
    .from("plan_billing_transactions")
    .select("*")
    .eq("user_id", userId)
    .eq("plan_code", "operation")
    .eq("livemode", livemode)
    .eq("status", "paid")
    .not("stripe_customer_id", "is", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data ? mapTransaction(data) : null;
}

export async function updatePlanSubscriptionState(transactionId: string, status: PlanTransaction["status"], periodEnd: string | null, cancelAtPeriodEnd: boolean) {
  const { data, error } = await requireSupabaseAdminClient().from("plan_billing_transactions").update({ status, current_period_end: periodEnd, cancel_at_period_end: cancelAtPeriodEnd }).eq("id", transactionId).select("*").single();
  if (error) throw error;
  return mapTransaction(data);
}

export async function insertOrUpdatePlanFulfillment(input: Omit<PlanTransaction, "id">) {
  const admin = requireSupabaseAdminClient();
  const existing = await findPlanTransaction(input.checkoutSessionId);
  if (existing) {
    if (existing.userId !== input.userId || existing.planCode !== input.planCode || existing.livemode !== input.livemode) throw new Error("Billing session ownership mismatch.");
    const { data, error } = await admin.from("plan_billing_transactions").update({ status: input.status, stripe_payment_intent_id: input.paymentIntentId, stripe_customer_id: input.customerId, stripe_subscription_id: input.subscriptionId, current_period_end: input.currentPeriodEnd, cancel_at_period_end: input.cancelAtPeriodEnd }).eq("id", existing.id).select("*").single();
    if (error) throw error;
    return mapTransaction(data);
  }
  const { data, error } = await admin.from("plan_billing_transactions").insert({ user_id: input.userId, plan_code: input.planCode, book_id: input.bookId, stripe_checkout_session_id: input.checkoutSessionId, stripe_payment_intent_id: input.paymentIntentId, stripe_customer_id: input.customerId, stripe_subscription_id: input.subscriptionId, livemode: input.livemode, amount: input.amount, currency: input.currency, status: input.status, current_period_end: input.currentPeriodEnd, cancel_at_period_end: input.cancelAtPeriodEnd }).select("*").single();
  if (error) throw error;
  return mapTransaction(data);
}

export async function upsertPlanEntitlement(transaction: PlanTransaction) {
  if (transaction.status !== "paid" || (transaction.planCode === "publication" && !transaction.bookId)) return null;
  const admin = requireSupabaseAdminClient();
  const query = admin.from("plan_entitlements").select("id").eq("user_id", transaction.userId).eq("plan_code", transaction.planCode).eq("livemode", transaction.livemode);
  const scoped = transaction.bookId ? query.eq("book_id", transaction.bookId) : query.is("book_id", null);
  const { data: existing, error: findError } = await scoped.maybeSingle();
  if (findError) throw findError;
  const values = { user_id: transaction.userId, plan_code: transaction.planCode, book_id: transaction.bookId, transaction_id: transaction.id, livemode: transaction.livemode, status: "active", expires_at: transaction.planCode === "operation" ? transaction.currentPeriodEnd : null, updated_at: new Date().toISOString() };
  if (existing?.id) {
    const { data, error } = await admin.from("plan_entitlements").update(values).eq("id", existing.id).select("*").single();
    if (error) throw error;
    return data;
  }
  const { data, error } = await admin.from("plan_entitlements").insert(values).select("*").single();
  if (error) throw error;
  return data;
}

export async function setPlanEntitlementStatus(transaction: PlanTransaction, status: "active" | "past_due" | "canceled" | "expired") {
  const admin = requireSupabaseAdminClient();
  const query = admin.from("plan_entitlements").update({ status, expires_at: status === "active" ? transaction.currentPeriodEnd : new Date().toISOString(), updated_at: new Date().toISOString() }).eq("user_id", transaction.userId).eq("plan_code", transaction.planCode).eq("livemode", transaction.livemode);
  const scoped = transaction.bookId ? query.eq("book_id", transaction.bookId) : query.is("book_id", null);
  const { error } = await scoped;
  if (error) throw error;
}
