import { NextResponse } from "next/server";
import { requireStripeClient } from "@/lib/server/stripe";
import { expectedStripeLivemode } from "@/lib/server/stripeEnvironment";
import { fulfillPlanCheckoutSession, handlePlanSubscriptionEvent } from "@/lib/server/planBillingFulfillment";

export const runtime = "nodejs";
const supportedEvents = new Set(["checkout.session.completed", "invoice.paid", "invoice.payment_failed", "customer.subscription.updated", "customer.subscription.deleted"]);

export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");
  const secret = process.env.STRIPE_PLAN_WEBHOOK_SECRET?.trim();
  if (!signature || !secret) return NextResponse.json({ received: false }, { status: 503 });
  let event: import("stripe").default.Event;
  try { event = requireStripeClient().webhooks.constructEvent(await request.text(), signature, secret); } catch { return NextResponse.json({ received: false }, { status: 400 }); }
  if (!supportedEvents.has(event.type)) return NextResponse.json({ received: true });
  try { if (event.livemode !== expectedStripeLivemode()) return NextResponse.json({ received: false }, { status: 400 }); } catch { return NextResponse.json({ received: false }, { status: 503 }); }
  try {
    if (event.type === "checkout.session.completed") await fulfillPlanCheckoutSession((event.data.object as import("stripe").default.Checkout.Session).id, undefined, event.livemode);
    else await handlePlanSubscriptionEvent(event, event.livemode);
  } catch { return NextResponse.json({ received: false }, { status: 500 }); }
  return NextResponse.json({ received: true });
}
