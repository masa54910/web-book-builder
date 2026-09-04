import { NextResponse } from "next/server";

import { isPlanCode, PLAN_DEFINITIONS, configuredPlanPriceId } from "@/lib/planBilling";
import { findPaidPublication } from "@/lib/server/planBillingRepository";
import { requireSupabaseAdminClient } from "@/lib/server/supabaseAdmin";
import { requireStripeClient } from "@/lib/server/stripe";
import { expectedStripeLivemode } from "@/lib/server/stripeEnvironment";
import { requireAuthenticatedUser } from "@/lib/server/requestAuth";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const user = await requireAuthenticatedUser(request);
    if (!user) return NextResponse.json({ error: "認証が必要です。" }, { status: 401 });
    const body = await request.json() as { plan?: unknown; bookId?: unknown };
    const plan = body.plan;
    if (!isPlanCode(plan)) return NextResponse.json({ error: "プランを選択してください。" }, { status: 400 });
    const bookId = typeof body.bookId === "string" && body.bookId.trim() ? body.bookId.trim() : null;
    if (plan === "publication") {
      if (!bookId) return NextResponse.json({ error: "出版する作品を選択してください。" }, { status: 400 });
      const { data: book, error } = await requireSupabaseAdminClient().from("books").select("id").eq("id", bookId).eq("owner_id", user.id).is("deleted_at", null).maybeSingle();
      if (error || !book) return NextResponse.json({ error: "作品が見つかりません。" }, { status: 404 });
      if (await findPaidPublication(user.id, bookId, expectedStripeLivemode())) return NextResponse.json({ error: "この作品はすでに出版プランが有効です。" }, { status: 409 });
    }
    const definition = PLAN_DEFINITIONS[plan];
    const stripe = requireStripeClient();
    const origin = new URL(request.url).origin;
    const session = await stripe.checkout.sessions.create({
      mode: definition.checkoutMode,
      line_items: [{ price: configuredPlanPriceId(plan), quantity: 1 }],
      success_url: `${origin}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/pricing`,
      client_reference_id: user.id,
      customer_email: user.email || undefined,
      metadata: { billing_type: "webbookmaker_plan", plan_code: plan, user_id: user.id, ...(bookId ? { book_id: bookId } : {}) },
      ...(definition.checkoutMode === "subscription" ? { subscription_data: { metadata: { billing_type: "webbookmaker_plan", plan_code: plan, user_id: user.id } } } : {}),
    }, { idempotencyKey: `webbookmaker-plan-${plan}-${user.id}-${bookId || "account"}` });
    if (!session.url) return NextResponse.json({ error: "Checkout URLを作成できませんでした。" }, { status: 503 });
    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("billing.checkout failed", error instanceof Error ? error.message : "unknown");
    return NextResponse.json({ error: "決済を開始できませんでした。" }, { status: 503 });
  }
}
