import "server-only";

import { parseBookProjectJson } from "@/lib/bookProjectNormalization";
import { evaluateSalesLegalTerms, evaluateSellerProfileCompleteness, evaluateStripeSellerReadiness } from "@/lib/sellerConnect";
import { getAuthorSellerProfile, getAuthorStripeAccount } from "@/lib/server/sellerConnectRepository";
import { getConnectBookSale } from "@/lib/server/connectSalesRepository";
import { CONNECT_TERMS_VERSION, getSalesConsent } from "@/lib/server/salesConsentRepository";
import { requireSupabaseAdminClient } from "@/lib/server/supabaseAdmin";
import { expectedStripeLivemode } from "@/lib/server/stripeEnvironment";
import { requireStripeClient } from "@/lib/server/stripe";

export async function runConnectPaymentPreflight(ownerId: string, bookId: string) {
  const mode = expectedStripeLivemode();
  const { data: book, error } = await requireSupabaseAdminClient().from("books").select("id,owner_id,book_project_json").eq("id", bookId).eq("owner_id", ownerId).maybeSingle();
  if (error || !book) throw new Error("作品が見つかりません。");
  const project = parseBookProjectJson(book.book_project_json);
  const profile = await getAuthorSellerProfile(ownerId);
  const consent = await getSalesConsent(ownerId);
  const account = await getAuthorStripeAccount(ownerId, mode);
  const sale = await getConnectBookSale(bookId, mode);
  const readiness = evaluateStripeSellerReadiness(account);
  const checks = {
    sellerProfile: evaluateSellerProfileCompleteness(profile).complete,
    consent: consent?.termsVersion === CONNECT_TERMS_VERSION,
    connectedAccount: readiness.connected,
    onboarding: readiness.onboardingComplete,
    merchant: readiness.merchantActive,
    charges: readiness.chargesEnabled,
    payouts: readiness.payoutsEnabled,
    paywall: Boolean(project?.contentBlocks?.some((block) => block.type === "paywall")),
    salesSetting: Boolean(sale?.enabled && sale.ownerId === ownerId && sale.stripeLivemode === mode),
    amountCurrency: Boolean(sale && sale.amount > 0 && (sale.currency === "jpy" || sale.currency === "usd")),
    legalTerms: evaluateSalesLegalTerms(sale?.legalTerms).complete,
  };
  let paymentLinkReachable = false;
  if (sale?.enabled && account?.stripeAccountId) {
    try {
      const link = await requireStripeClient().paymentLinks.retrieve(sale.stripePaymentLinkId, undefined, { stripeAccount: account.stripeAccountId });
      paymentLinkReachable = link.active === true && link.livemode === mode;
    } catch {
      paymentLinkReachable = false;
    }
  }
  const allChecks = { ...checks, paymentLinkReachable };
  return { readyForPayment: Object.values(allChecks).every(Boolean), livemode: mode, checks: allChecks, paymentLinkId: sale?.stripePaymentLinkId ?? null, amount: sale?.amount ?? null, currency: sale?.currency ?? null };
}
