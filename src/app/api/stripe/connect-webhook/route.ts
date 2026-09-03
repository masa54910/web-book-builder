import { NextResponse } from "next/server";

import { fulfillConnectedCheckoutSession, FulfillmentError } from "@/lib/server/purchaseFulfillment";
import { requireStripeClient } from "@/lib/server/stripe";
import { expectedStripeLivemode } from "@/lib/server/stripeEnvironment";
import { recordConnectWebhookEvent, revokeConnectPurchaseByPaymentIntent } from "@/lib/server/connectWebhookOperations";

export const runtime = "nodejs";

/** Connect-only webhook. The existing platform webhook remains responsible for legacy Payment Links. */
export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");
  const secret = process.env.STRIPE_CONNECT_WEBHOOK_SECRET?.trim();
  if (!signature || !secret) return NextResponse.json({ received: false }, { status: 503 });

  let event: import("stripe").default.Event;
  try {
    event = requireStripeClient().webhooks.constructEvent(await request.text(), signature, secret);
  } catch {
    return NextResponse.json({ received: false }, { status: 400 });
  }
  const connectedAccountId = typeof event.account === "string" ? event.account : "";
  if (!connectedAccountId) return NextResponse.json({ received: false }, { status: 400 });
  try {
    if (event.livemode !== expectedStripeLivemode()) return NextResponse.json({ received: false }, { status: 400 });
  } catch {
    return NextResponse.json({ received: false }, { status: 503 });
  }

  if (event.type === "charge.refunded" || event.type === "charge.dispute.created") {
    const charge = event.data.object as import("stripe").default.Charge;
    const paymentIntentId = typeof charge.payment_intent === "string" ? charge.payment_intent : charge.payment_intent?.id;
    if (paymentIntentId) {
      try { await revokeConnectPurchaseByPaymentIntent(paymentIntentId, connectedAccountId, event.livemode); }
      catch (error) { console.error("connect purchase revocation failed", error instanceof Error ? error.message : "unknown"); return NextResponse.json({ received: false }, { status: 500 }); }
    }
    try { await recordConnectWebhookEvent(event.id, connectedAccountId, event.livemode, event.type); }
    catch (error) { console.error("connect webhook ledger write failed", error instanceof Error ? error.message : "unknown"); return NextResponse.json({ received: false }, { status: 500 }); }
    return NextResponse.json({ received: true });
  }
  if (event.type !== "checkout.session.completed") {
    try { await recordConnectWebhookEvent(event.id, connectedAccountId, event.livemode, event.type); } catch { return NextResponse.json({ received: false }, { status: 500 }); }
    return NextResponse.json({ received: true });
  }
  const session = event.data.object as import("stripe").default.Checkout.Session;
  try {
    await fulfillConnectedCheckoutSession(session.id, connectedAccountId, event.livemode);
    await recordConnectWebhookEvent(event.id, connectedAccountId, event.livemode, event.type);
    return NextResponse.json({ received: true });
  } catch (error) {
    if (error instanceof FulfillmentError) return NextResponse.json({ received: false }, { status: 400 });
    console.error("connect webhook fulfillment failed", error instanceof Error ? error.message : "unknown");
    return NextResponse.json({ received: false }, { status: 500 });
  }
}
