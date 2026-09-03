import "server-only";

import type Stripe from "stripe";

import { requireStripeClient } from "./stripe";
import { getSupabaseAdminClient } from "./supabaseAdmin";
import { expectedStripeLivemode } from "./stripeEnvironment";
import { findConnectSaleByPaymentLink } from "./connectSalesRepository";
import {
  fulfillCheckoutSession as fulfillCore,
  type CheckoutSessionForFulfillment,
  type FulfillmentDependencies,
  type PurchaseDatabase,
  type PurchaseRecord,
  type SaleSettingsRecord,
} from "./purchaseFulfillmentCore";

function requireAdminDatabase(connectAccountId?: string) {
  const client = getSupabaseAdminClient();
  if (!client) throw new Error("Purchase server configuration is unavailable.");

  const database: PurchaseDatabase = {
    async findSaleSettings(paymentLinkId, stripeLivemode): Promise<SaleSettingsRecord | null> {
      if (connectAccountId) {
        const connectSale = await findConnectSaleByPaymentLink(paymentLinkId, stripeLivemode);
        if (connectSale && connectSale.stripeAccountId === connectAccountId) {
          return {
            book_id: connectSale.bookId,
            stripeLivemode: connectSale.stripeLivemode,
            stripe_payment_link_id: connectSale.stripePaymentLinkId,
            stripe_price_id: connectSale.stripePriceId,
            amount: connectSale.amount,
            currency: connectSale.currency,
            enabled: connectSale.enabled,
            stripeAccountId: connectSale.stripeAccountId,
          };
        }
      }
      const { data, error } = await client
        .from("book_sales_settings")
        .select("book_id,stripe_livemode,stripe_payment_link_id,stripe_price_id,amount,currency,enabled")
        .eq("stripe_payment_link_id", paymentLinkId)
        .eq("stripe_livemode", stripeLivemode)
        .maybeSingle();
      if (error) throw error;
      return data
        ? { ...data, stripeLivemode: Boolean((data as { stripe_livemode?: unknown }).stripe_livemode) } as SaleSettingsRecord
        : null;
    },
    async findBookSlug(bookId) {
      const { data, error } = await client.from("books").select("slug").eq("id", bookId).maybeSingle<{ slug: string | null }>();
      if (error) throw error;
      return typeof data?.slug === "string" && data.slug ? data.slug : null;
    },
    async findPurchase(sessionId): Promise<PurchaseRecord | null> {
      const { data, error } = await client
        .from("book_purchases")
        .select("id,book_id,stripe_livemode,stripe_checkout_session_id,stripe_payment_intent_id,buyer_email,amount,currency,payment_status,access_code_hash,access_code_ciphertext,revoked_at")
        .eq("stripe_checkout_session_id", sessionId)
        .maybeSingle();
      if (error) throw error;
      return data
        ? { ...data, stripeLivemode: Boolean((data as { stripe_livemode?: unknown }).stripe_livemode) } as PurchaseRecord
        : null;
    },
    async insertPurchase(record) {
      const { data, error } = await client.from("book_purchases").insert({
        book_id: record.book_id,
        stripe_livemode: record.stripeLivemode,
        stripe_checkout_session_id: record.stripe_checkout_session_id,
        stripe_payment_intent_id: record.stripe_payment_intent_id,
        buyer_email: record.buyer_email,
        amount: record.amount,
        currency: record.currency,
        payment_status: record.payment_status,
        access_code_hash: record.access_code_hash,
        access_code_ciphertext: record.access_code_ciphertext,
      }).select("id,book_id,stripe_livemode,stripe_checkout_session_id,stripe_payment_intent_id,buyer_email,amount,currency,payment_status,access_code_hash,access_code_ciphertext,revoked_at").single();
      return {
        data: data
          ? { ...data, stripeLivemode: Boolean((data as { stripe_livemode?: unknown }).stripe_livemode) } as PurchaseRecord
          : null,
        error,
      };
    },
  };
  return database;
}

function asFulfillmentSession(session: Stripe.Checkout.Session): CheckoutSessionForFulfillment {
  return {
    id: session.id,
    livemode: session.livemode,
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

export async function fulfillCheckoutSession(sessionId: string, expectedEventLivemode?: boolean) {
  const stripe = requireStripeClient();
  const dependencies: FulfillmentDependencies = {
    retrieveSession: async (id) => {
      const session = await stripe.checkout.sessions.retrieve(id, { expand: ["line_items.data.price"] });
      return asFulfillmentSession(session);
    },
    database: requireAdminDatabase(),
    expectedLivemode: expectedEventLivemode ?? expectedStripeLivemode(),
  };
  return fulfillCore(sessionId, dependencies);
}

/** Fulfill a Direct Charge session after validating its connected account context. */
export async function fulfillConnectedCheckoutSession(sessionId: string, connectedAccountId: string, expectedEventLivemode?: boolean) {
  const stripe = requireStripeClient();
  const expectedLivemode = expectedEventLivemode ?? expectedStripeLivemode();
  const dependencies: FulfillmentDependencies = {
    retrieveSession: async (id) => {
      const session = await stripe.checkout.sessions.retrieve(id, { expand: ["line_items.data.price"] }, { stripeAccount: connectedAccountId });
      return asFulfillmentSession(session);
    },
    database: requireAdminDatabase(connectedAccountId),
    expectedLivemode,
    expectedStripeAccountId: connectedAccountId,
  };
  return fulfillCore(sessionId, dependencies);
}

export { FulfillmentError, validateCheckoutSessionId } from "./purchaseFulfillmentCore";
