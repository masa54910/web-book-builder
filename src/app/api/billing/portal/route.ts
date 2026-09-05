import { NextResponse } from "next/server";

import { findActiveOperationPlanForUser } from "@/lib/server/planBillingRepository";
import { requireAuthenticatedUser } from "@/lib/server/requestAuth";
import { requireStripeClient } from "@/lib/server/stripe";
import { expectedStripeLivemode } from "@/lib/server/stripeEnvironment";

export async function POST(request: Request) {
  try {
    const user = await requireAuthenticatedUser(request);
    if (!user) return NextResponse.json({ error: "ログインが必要です。" }, { status: 401 });
    const transaction = await findActiveOperationPlanForUser(user.id, expectedStripeLivemode());
    if (!transaction?.customerId) return NextResponse.json({ error: "管理できる運用プランが見つかりません。" }, { status: 404 });
    const origin = new URL(request.url).origin;
    const session = await requireStripeClient().billingPortal.sessions.create({ customer: transaction.customerId, return_url: `${origin}/settings` });
    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("billing.portal failed", error instanceof Error ? error.message : "unknown");
    return NextResponse.json({ error: "プラン管理画面を開けませんでした。" }, { status: 503 });
  }
}
