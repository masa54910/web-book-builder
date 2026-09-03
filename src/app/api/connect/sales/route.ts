import { NextResponse } from "next/server";

import { createOrReuseConnectPaymentLink } from "@/lib/server/connectPaymentLinks";
import { getConnectBookSale } from "@/lib/server/connectSalesRepository";
import { requireAuthenticatedUser } from "@/lib/server/requestAuth";
import { expectedStripeLivemode } from "@/lib/server/stripeEnvironment";

export async function GET(request: Request) {
  try {
    const user = await requireAuthenticatedUser(request);
    if (!user) return NextResponse.json({ error: "認証が必要です。" }, { status: 401 });
    const bookId = new URL(request.url).searchParams.get("bookId") || "";
    const sale = await getConnectBookSale(bookId, expectedStripeLivemode());
    if (!sale || sale.ownerId !== user.id) return NextResponse.json({ sale: null });
    return NextResponse.json({ sale: { amount: sale.amount, currency: sale.currency, enabled: sale.enabled, legalTerms: sale.legalTerms } });
  } catch (error) {
    console.error("connect.sales.read failed", error instanceof Error ? error.message : "unknown");
    return NextResponse.json({ error: "販売設定を読み込めませんでした。" }, { status: 503 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireAuthenticatedUser(request);
    if (!user) return NextResponse.json({ error: "認証が必要です。" }, { status: 401 });
    const body = await request.json() as { bookId?: unknown; amount?: unknown; currency?: unknown; legalTerms?: unknown };
    const rawTerms = body.legalTerms && typeof body.legalTerms === "object" ? body.legalTerms as Record<string, unknown> : {};
    const result = await createOrReuseConnectPaymentLink(user.id, {
      bookId: String(body.bookId || ""),
      amount: Number(body.amount),
      currency: body.currency === "usd" ? "usd" : "jpy",
      legalTerms: {
        paymentMethod: String(rawTerms.paymentMethod || ""),
        paymentTiming: String(rawTerms.paymentTiming || ""),
        digitalDeliveryTiming: String(rawTerms.digitalDeliveryTiming || ""),
        refundPolicy: String(rawTerms.refundPolicy || ""),
        additionalCosts: String(rawTerms.additionalCosts || ""),
        applicationDeadline: String(rawTerms.applicationDeadline || ""),
      },
    }, new URL(request.url).origin);
    return NextResponse.json({ paymentLinkUrl: result.paymentLinkUrl, sale: result.sale, reused: result.reused });
  } catch (error) {
    console.error("connect.sales.create failed", error instanceof Error ? error.message : "unknown");
    return NextResponse.json({ error: error instanceof Error ? error.message : "販売リンクを作成できませんでした。" }, { status: 422 });
  }
}
