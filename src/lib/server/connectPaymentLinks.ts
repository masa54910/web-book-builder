import "server-only";

import type Stripe from "stripe";

import { parseBookProjectJson } from "@/lib/bookProjectNormalization";
import { evaluateSalesLegalTerms, evaluateStripeSellerReadiness, type SalesLegalTerms } from "@/lib/sellerConnect";
import { getAuthorStripeAccount } from "@/lib/server/sellerConnectRepository";
import { getConnectBookSale, saveConnectBookSale, updateConnectBookSaleLegalTerms } from "@/lib/server/connectSalesRepository";
import { requireSupabaseAdminClient } from "@/lib/server/supabaseAdmin";
import { requireStripeClient } from "@/lib/server/stripe";
import { expectedStripeLivemode } from "@/lib/server/stripeEnvironment";

export type ConnectSaleInput = { bookId: string; amount: number; currency: "jpy" | "usd"; legalTerms: SalesLegalTerms };

function metadata(bookId: string, ownerId: string, accountId: string, livemode: boolean) {
  return {
    webbookmaker_book_id: bookId,
    webbookmaker_owner_id: ownerId,
    webbookmaker_stripe_account_id: accountId,
    webbookmaker_livemode: String(livemode),
    webbookmaker_sales_channel: "connect_direct_charge",
  };
}

function assertInput(input: ConnectSaleInput) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(input.bookId)) throw new Error("Book ID is invalid.");
  if (!Number.isSafeInteger(input.amount) || input.amount <= 0 || input.amount > 10_000_000) throw new Error("Sale amount is invalid.");
  if (input.currency !== "jpy" && input.currency !== "usd") throw new Error("Currency is invalid.");
  const legalTerms = evaluateSalesLegalTerms(input.legalTerms);
  if (!legalTerms.complete) throw new Error(`販売条件が不足しています: ${legalTerms.missingFields.join(", ")}`);
}

async function ownedBook(bookId: string, ownerId: string) {
  const { data, error } = await requireSupabaseAdminClient().from("books").select("id,owner_id,title,book_project_json").eq("id", bookId).eq("owner_id", ownerId).maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("Book was not found.");
  const project = parseBookProjectJson(data.book_project_json);
  if (!project || !(project.contentBlocks || []).some((block) => block.type === "paywall")) throw new Error("A Paywall is required before paid sales can be enabled.");
  return { id: String(data.id), ownerId: String(data.owner_id), title: String(data.title || project.config.title || "WebBook") };
}

export async function createOrReuseConnectPaymentLink(ownerId: string, input: ConnectSaleInput, fallbackOrigin: string) {
  assertInput(input);
  const livemode = expectedStripeLivemode();
  const book = await ownedBook(input.bookId, ownerId);
  const account = await getAuthorStripeAccount(ownerId, livemode);
  const readiness = evaluateStripeSellerReadiness(account);
  if (!account || !readiness.connected || !readiness.onboardingComplete || !readiness.merchantActive || !readiness.chargesEnabled || !readiness.payoutsEnabled) {
    throw new Error("Stripe本人確認と入金設定を完了してから販売を設定してください。");
  }
  const existing = await getConnectBookSale(book.id, livemode);
  if (existing) {
    if (existing.ownerId !== ownerId || existing.stripeAccountId !== account.stripeAccountId || existing.amount !== input.amount || existing.currency !== input.currency || !existing.enabled) throw new Error("このBookには別の販売設定が存在します。");
    const existingLink = await requireStripeClient().paymentLinks.retrieve(existing.stripePaymentLinkId, undefined, { stripeAccount: account.stripeAccountId });
    const updatedSale = await updateConnectBookSaleLegalTerms(book.id, ownerId, livemode, input.legalTerms);
    return { sale: updatedSale ?? existing, paymentLinkUrl: existingLink.url, reused: true };
  }

  const stripe = requireStripeClient();
  const requestOptions = { stripeAccount: account.stripeAccountId };
  const objectMetadata = metadata(book.id, ownerId, account.stripeAccountId, livemode);
  const product = await stripe.products.create({ name: book.title.slice(0, 250), metadata: objectMetadata }, { ...requestOptions, idempotencyKey: `connect-product:${book.id}:${livemode ? "live" : "test"}` });
  const price = await stripe.prices.create({ currency: input.currency, unit_amount: input.amount, product: product.id, metadata: objectMetadata }, { ...requestOptions, idempotencyKey: `connect-price:${book.id}:${livemode ? "live" : "test"}` });
  const origin = new URL(process.env.NEXT_PUBLIC_SITE_URL?.trim() || fallbackOrigin).origin;
  const link = await stripe.paymentLinks.create({
    line_items: [{ price: price.id, quantity: 1 }],
    after_completion: { type: "redirect", redirect: { url: `${origin}/purchase/success?session_id={CHECKOUT_SESSION_ID}` } },
    metadata: objectMetadata,
  }, { ...requestOptions, idempotencyKey: `connect-payment-link:${book.id}:${livemode ? "live" : "test"}` });
  const sale = await saveConnectBookSale({ bookId: book.id, ownerId, stripeLivemode: livemode, stripeAccountId: account.stripeAccountId, stripeProductId: product.id, stripePriceId: price.id, stripePaymentLinkId: link.id, amount: input.amount, currency: input.currency, enabled: true, legalTerms: input.legalTerms });
  return { sale, paymentLinkUrl: link.url, reused: false };
}

export function buildConnectPaymentLinkMetadata(bookId: string, ownerId: string, accountId: string, livemode: boolean) {
  return metadata(bookId, ownerId, accountId, livemode);
}

export function directChargeRequestOptions(accountId: string) {
  return { stripeAccount: accountId } satisfies Stripe.RequestOptions;
}
