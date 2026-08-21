import { NextResponse } from "next/server";

import { requireStripeClient } from "@/lib/server/stripe";
import { FulfillmentError, fulfillCheckoutSession } from "@/lib/server/purchaseFulfillment";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");
  const secret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  if (!signature || !secret) return NextResponse.json({ received: false }, { status: 503 });

  let event: import("stripe").default.Event;
  try {
    const payload = await request.text();
    event = requireStripeClient().webhooks.constructEvent(payload, signature, secret);
  } catch {
    return NextResponse.json({ received: false }, { status: 400 });
  }

  if (event.type !== "checkout.session.completed") {
    return NextResponse.json({ received: true });
  }

  const session = event.data.object as import("stripe").default.Checkout.Session;
  try {
    await fulfillCheckoutSession(session.id);
    return NextResponse.json({ received: true });
  } catch (error) {
    if (error instanceof FulfillmentError) return NextResponse.json({ received: false }, { status: 400 });
    return NextResponse.json({ received: false }, { status: 500 });
  }
}
