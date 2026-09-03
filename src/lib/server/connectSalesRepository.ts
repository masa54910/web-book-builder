import "server-only";

import { requireSupabaseAdminClient } from "@/lib/server/supabaseAdmin";
import type { SalesLegalTerms } from "@/lib/sellerConnect";

function relationMissing(error: unknown) {
  const text = error && typeof error === "object" ? `${String((error as { code?: unknown }).code ?? "")} ${String((error as { message?: unknown }).message ?? "")}` : "";
  return /connect_book_sales|relation .* does not exist/iu.test(text);
}

export type ConnectBookSaleRecord = {
  id?: string;
  bookId: string;
  ownerId: string;
  stripeLivemode: boolean;
  stripeAccountId: string;
  stripeProductId: string;
  stripePriceId: string;
  stripePaymentLinkId: string;
  amount: number;
  currency: string;
  enabled: boolean;
  legalTerms: SalesLegalTerms;
};

function map(row: Record<string, unknown>): ConnectBookSaleRecord {
  return {
    id: typeof row.id === "string" ? row.id : undefined,
    bookId: String(row.book_id),
    ownerId: String(row.owner_id),
    stripeLivemode: Boolean(row.stripe_livemode),
    stripeAccountId: String(row.stripe_account_id),
    stripeProductId: String(row.stripe_product_id),
    stripePriceId: String(row.stripe_price_id),
    stripePaymentLinkId: String(row.stripe_payment_link_id),
    amount: Number(row.amount),
    currency: String(row.currency),
    enabled: Boolean(row.enabled),
    legalTerms: {
      paymentMethod: String(row.payment_method ?? ""),
      paymentTiming: String(row.payment_timing ?? ""),
      digitalDeliveryTiming: String(row.digital_delivery_timing ?? ""),
      refundPolicy: String(row.refund_policy ?? ""),
      additionalCosts: String(row.additional_costs ?? ""),
      applicationDeadline: String(row.application_deadline ?? ""),
    },
  };
}

export async function getConnectBookSale(bookId: string, stripeLivemode: boolean) {
  const { data, error } = await requireSupabaseAdminClient().from("connect_book_sales").select("*").eq("book_id", bookId).eq("stripe_livemode", stripeLivemode).maybeSingle();
  if (error && !relationMissing(error)) throw error;
  return data ? map(data) : null;
}

export async function findConnectSaleByPaymentLink(paymentLinkId: string, stripeLivemode: boolean) {
  const { data, error } = await requireSupabaseAdminClient().from("connect_book_sales").select("*").eq("stripe_payment_link_id", paymentLinkId).eq("stripe_livemode", stripeLivemode).maybeSingle();
  if (error && !relationMissing(error)) throw error;
  return data ? map(data) : null;
}

export async function saveConnectBookSale(sale: ConnectBookSaleRecord) {
  const { data, error } = await requireSupabaseAdminClient().from("connect_book_sales").upsert({
    book_id: sale.bookId,
    owner_id: sale.ownerId,
    stripe_livemode: sale.stripeLivemode,
    stripe_account_id: sale.stripeAccountId,
    stripe_product_id: sale.stripeProductId,
    stripe_price_id: sale.stripePriceId,
    stripe_payment_link_id: sale.stripePaymentLinkId,
    amount: sale.amount,
    currency: sale.currency.toLowerCase(),
    enabled: sale.enabled,
    payment_method: sale.legalTerms.paymentMethod.trim(),
    payment_timing: sale.legalTerms.paymentTiming.trim(),
    digital_delivery_timing: sale.legalTerms.digitalDeliveryTiming.trim(),
    refund_policy: sale.legalTerms.refundPolicy.trim(),
    additional_costs: sale.legalTerms.additionalCosts.trim(),
    application_deadline: sale.legalTerms.applicationDeadline?.trim() || null,
  }, { onConflict: "book_id,stripe_livemode" }).select("*").single();
  if (error) throw error;
  return map(data);
}

export async function updateConnectBookSaleLegalTerms(
  bookId: string,
  ownerId: string,
  stripeLivemode: boolean,
  legalTerms: SalesLegalTerms,
) {
  const { data, error } = await requireSupabaseAdminClient()
    .from("connect_book_sales")
    .update({
      payment_method: legalTerms.paymentMethod.trim(),
      payment_timing: legalTerms.paymentTiming.trim(),
      digital_delivery_timing: legalTerms.digitalDeliveryTiming.trim(),
      refund_policy: legalTerms.refundPolicy.trim(),
      additional_costs: legalTerms.additionalCosts.trim(),
      application_deadline: legalTerms.applicationDeadline?.trim() || null,
    })
    .eq("book_id", bookId)
    .eq("owner_id", ownerId)
    .eq("stripe_livemode", stripeLivemode)
    .select("*")
    .maybeSingle();
  if (error) throw error;
  return data ? map(data) : null;
}
