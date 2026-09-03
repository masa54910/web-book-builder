import "server-only";

import { requireSupabaseAdminClient } from "@/lib/server/supabaseAdmin";
import { findConnectSaleByPaymentLink } from "@/lib/server/connectSalesRepository";

export async function recordConnectWebhookEvent(eventId: string, accountId: string, livemode: boolean, eventType: string) {
  const { data, error } = await requireSupabaseAdminClient().from("connect_webhook_events").insert({ event_id: eventId, stripe_account_id: accountId, stripe_livemode: livemode, event_type: eventType }).select("event_id").maybeSingle();
  if (!error) return Boolean(data);
  const value = error as { code?: unknown; message?: unknown };
  if (value.code === "23505" || /duplicate key|unique constraint/iu.test(String(value.message || ""))) return false;
  throw error;
}

/** Revoke access after a connected-account refund/dispute without rewriting payment history. */
export async function revokeConnectPurchaseByPaymentIntent(paymentIntentId: string, accountId: string, livemode: boolean) {
  const admin = requireSupabaseAdminClient();
  const { data: purchase, error } = await admin.from("book_purchases").select("id,book_id,stripe_livemode,revoked_at").eq("stripe_payment_intent_id", paymentIntentId).eq("stripe_livemode", livemode).maybeSingle();
  if (error) throw error;
  if (!purchase || purchase.revoked_at) return false;
  const { data: sale } = await admin.from("connect_book_sales").select("stripe_account_id").eq("book_id", purchase.book_id).eq("stripe_livemode", livemode).maybeSingle();
  if (!sale || sale.stripe_account_id !== accountId) return false;
  const { error: updateError } = await admin.from("book_purchases").update({ revoked_at: new Date().toISOString() }).eq("id", purchase.id).eq("stripe_livemode", livemode).is("revoked_at", null);
  if (updateError) throw updateError;
  return true;
}

export async function connectSaleForPaymentLink(paymentLinkId: string, livemode: boolean) {
  return findConnectSaleByPaymentLink(paymentLinkId, livemode);
}
