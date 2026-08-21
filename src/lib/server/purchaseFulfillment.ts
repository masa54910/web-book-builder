import "server-only";

import type Stripe from "stripe";

import { requireStripeClient } from "./stripe";
import { getSupabaseAdminClient } from "./supabaseAdmin";
import {
  fulfillCheckoutSession as fulfillCore,
  type CheckoutSessionForFulfillment,
  type FulfillmentDependencies,
  type PurchaseDatabase,
  type PurchaseRecord,
  type SaleSettingsRecord,
} from "./purchaseFulfillmentCore";

function requireAdminDatabase() {
  const client = getSupabaseAdminClient();
  if (!client) throw new Error("Purchase server configuration is unavailable.");

  const database: PurchaseDatabase = {
    async findSaleSettings(paymentLinkId): Promise<SaleSettingsRecord | null> {
      const { data, error } = await client
        .from("book_sales_settings")
        .select("book_id,stripe_payment_link_id,stripe_price_id,amount,currency,enabled")
        .eq("stripe_payment_link_id", paymentLinkId)
        .maybeSingle();
      if (error) throw error;
      return (data || null) as SaleSettingsRecord | null;
    },
    async findBookSlug(bookId) {
      const { data, error } = await client.from("books").select("slug").eq("id", bookId).maybeSingle<{ slug: string | null }>();
      if (error) throw error;
      return typeof data?.slug === "string" && data.slug ? data.slug : null;
    },
    async findPurchase(sessionId): Promise<PurchaseRecord | null> {
      const { data, error } = await client
        .from("book_purchases")
        .select("id,book_id,stripe_checkout_session_id,stripe_payment_intent_id,buyer_email,amount,currency,payment_status,access_code_hash,access_code_ciphertext")
        .eq("stripe_checkout_session_id", sessionId)
        .maybeSingle();
      if (error) throw error;
      return (data || null) as PurchaseRecord | null;
    },
    async insertPurchase(record) {
      const { data, error } = await client.from("book_purchases").insert(record).select("id,book_id,stripe_checkout_session_id,stripe_payment_intent_id,buyer_email,amount,currency,payment_status,access_code_hash,access_code_ciphertext").single();
      return { data: (data || null) as PurchaseRecord | null, error };
    },
  };
  return database;
}

function asFulfillmentSession(session: Stripe.Checkout.Session): CheckoutSessionForFulfillment {
  return {
    id: session.id,
    mode: session.mode,
    status: session.status,
    payment_status: session.payment_status,
    amount_total: session.amount_total,
    currency: session.currency,
    payment_link: typeof session.payment_link === "string" ? session.payment_link : null,
    payment_intent: typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent ? { id: session.payment_intent.id } : null,
    customer_details: session.customer_details ? { email: session.customer_details.email } : null,
    line_items: session.line_items
      ? { data: session.line_items.data.map((item) => ({ price: item.price && typeof item.price !== "string" ? { id: item.price.id } : null })) }
      : null,
  };
}

export async function fulfillCheckoutSession(sessionId: string) {
  const stripe = requireStripeClient();
  const dependencies: FulfillmentDependencies = {
    retrieveSession: async (id) => {
      const session = await stripe.checkout.sessions.retrieve(id, { expand: ["line_items.data.price"] });
      return asFulfillmentSession(session);
    },
    database: requireAdminDatabase(),
  };
  return fulfillCore(sessionId, dependencies);
}

export { FulfillmentError, validateCheckoutSessionId } from "./purchaseFulfillmentCore";
