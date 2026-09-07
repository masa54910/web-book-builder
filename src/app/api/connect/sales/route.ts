import { NextResponse } from "next/server";

import { createOrReuseConnectPaymentLink } from "@/lib/server/connectPaymentLinks";
import { getConnectBookSale } from "@/lib/server/connectSalesRepository";
import { requireAuthenticatedUser } from "@/lib/server/requestAuth";
import { expectedStripeLivemode } from "@/lib/server/stripeEnvironment";
import { hasPublicationEntitlement } from "@/lib/server/planBillingRepository";
import { requireStripeClient } from "@/lib/server/stripe";
import { getAuthorStripeAccount } from "@/lib/server/sellerConnectRepository";
import { evaluateStripeSellerReadiness } from "@/lib/sellerConnect";

export async function GET(request: Request) {
  try {
    const user = await requireAuthenticatedUser(request);
    if (!user) return NextResponse.json({ error: "認証が必要です。" }, { status: 401 });
    const bookId = new URL(request.url).searchParams.get("bookId") || "";
    const livemode = expectedStripeLivemode();
    const sale = await getConnectBookSale(bookId, livemode);
    if (!sale || sale.ownerId !== user.id) {
      const canCreateSale = Boolean(bookId && await hasPublicationEntitlement(user.id, bookId, livemode));
      const readiness = evaluateStripeSellerReadiness(await getAuthorStripeAccount(user.id, livemode));
      return NextResponse.json({ sale: null, canCreateSale, stripeConnected: readiness.connected && readiness.onboardingComplete && readiness.merchantActive && readiness.chargesEnabled && readiness.payoutsEnabled });
    }
    let paymentLinkUrl: string | null = null;
    const account = await getAuthorStripeAccount(user.id, sale.stripeLivemode);
    const readiness = evaluateStripeSellerReadiness(account);
    if (account?.stripeAccountId) {
      try {
        const link = await requireStripeClient().paymentLinks.retrieve(sale.stripePaymentLinkId, undefined, { stripeAccount: account.stripeAccountId });
        paymentLinkUrl = link.url;
      } catch { paymentLinkUrl = null; }
    }
    return NextResponse.json({ canCreateSale: true, stripeConnected: readiness.connected && readiness.onboardingComplete && readiness.merchantActive && readiness.chargesEnabled && readiness.payoutsEnabled, sale: { amount: sale.amount, currency: sale.currency, enabled: sale.enabled, paymentLinkUrl, legalTerms: sale.legalTerms } });
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
        paymentMethod: String(rawTerms.paymentMethod || "Stripe Payment Link（カード等）"),
        paymentTiming: String(rawTerms.paymentTiming || "注文時に決済"),
        digitalDeliveryTiming: String(rawTerms.digitalDeliveryTiming || "決済確認後すぐに閲覧可能"),
        refundPolicy: String(rawTerms.refundPolicy || "デジタル商品のため、法令上必要な場合を除き返品・返金は受け付けません。"),
        additionalCosts: String(rawTerms.additionalCosts || "追加料金なし"),
        applicationDeadline: String(rawTerms.applicationDeadline || ""),
      },
    }, new URL(request.url).origin);
    return NextResponse.json({ paymentLinkUrl: result.paymentLinkUrl, sale: result.sale, reused: result.reused });
  } catch (error) {
    console.error("connect.sales.create failed", error instanceof Error ? error.message : "unknown");
    return NextResponse.json({ error: error instanceof Error ? error.message : "販売リンクを作成できませんでした。" }, { status: 422 });
  }
}
