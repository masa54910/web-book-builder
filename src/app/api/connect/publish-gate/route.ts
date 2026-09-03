import { NextResponse } from "next/server";

import { parseBookProjectJson } from "@/lib/bookProjectNormalization";
import { evaluateSalesLegalTerms, evaluateSellerProfileCompleteness, evaluateStripeSellerReadiness } from "@/lib/sellerConnect";
import { getAuthorSellerProfile, getAuthorStripeAccount } from "@/lib/server/sellerConnectRepository";
import { getConnectBookSale } from "@/lib/server/connectSalesRepository";
import { CONNECT_TERMS_VERSION, getSalesConsent } from "@/lib/server/salesConsentRepository";
import { requireSupabaseAdminClient } from "@/lib/server/supabaseAdmin";
import { expectedStripeLivemode } from "@/lib/server/stripeEnvironment";
import { requireAuthenticatedUser } from "@/lib/server/requestAuth";

export async function POST(request: Request) {
  try {
    const user = await requireAuthenticatedUser(request);
    if (!user) return NextResponse.json({ error: "認証が必要です。" }, { status: 401 });
    const body = await request.json() as { bookId?: unknown };
    const bookId = typeof body.bookId === "string" ? body.bookId : "";
    const { data: book, error } = await requireSupabaseAdminClient().from("books").select("id,owner_id,book_project_json").eq("id", bookId).eq("owner_id", user.id).maybeSingle();
    if (error || !book) return NextResponse.json({ error: "作品が見つかりません。" }, { status: 404 });
    const project = parseBookProjectJson(book.book_project_json);
    const hasPaywall = Boolean(project?.contentBlocks?.some((block) => block.type === "paywall"));
    if (!hasPaywall) return NextResponse.json({ allowed: true, required: false });
    const mode = expectedStripeLivemode();
    const sale = await getConnectBookSale(bookId, mode);
    if (!sale?.enabled) return NextResponse.json({ allowed: true, required: false });
    const profile = await getAuthorSellerProfile(user.id);
    const account = await getAuthorStripeAccount(user.id, mode);
    const consent = await getSalesConsent(user.id);
    const stripe = evaluateStripeSellerReadiness(account);
    const checks = {
      seller: evaluateSellerProfileCompleteness(profile).complete,
      consent: consent?.termsVersion === CONNECT_TERMS_VERSION,
      stripeConnected: stripe.connected,
      onboarding: stripe.onboardingComplete,
      merchant: stripe.merchantActive,
      charges: stripe.chargesEnabled,
      payouts: stripe.payoutsEnabled,
      sales: sale.amount > 0 && (sale.currency === "jpy" || sale.currency === "usd") && sale.ownerId === user.id && sale.stripeLivemode === mode,
      legalTerms: evaluateSalesLegalTerms(sale.legalTerms).complete,
      paywall: hasPaywall,
    };
    const allowed = Object.values(checks).every(Boolean);
    return NextResponse.json(allowed ? { allowed: true, required: true } : { allowed: false, required: true, error: "販売者情報・同意・Stripe接続・販売条件を完成させてください。", checks }, { status: allowed ? 200 : 422 });
  } catch (error) {
    console.error("connect.publish-gate failed", error instanceof Error ? error.message : "unknown");
    return NextResponse.json({ error: "公開条件を確認できませんでした。" }, { status: 503 });
  }
}
