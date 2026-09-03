import "server-only";

import { requireSupabaseAdminClient } from "@/lib/server/supabaseAdmin";
import type { AuthorSellerProfile, AuthorSellerProfileInput, AuthorStripeAccount } from "@/lib/sellerConnect";

function requireUserId(userId: string) {
  const normalized = userId.trim();
  if (!normalized) throw new Error("Authenticated user ID is required.");
  return normalized;
}

function mapSellerProfile(row: Record<string, unknown>): AuthorSellerProfile {
  return {
    userId: String(row.user_id),
    sellerType: row.seller_type === "company" ? "company" : "individual",
    legalName: String(row.legal_name ?? ""),
    tradeName: String(row.trade_name ?? ""),
    representativeName: String(row.representative_name ?? ""),
    countryCode: String(row.country_code ?? "JP"),
    postalCode: String(row.postal_code ?? ""),
    region: String(row.region ?? ""),
    city: String(row.city ?? ""),
    addressLine1: String(row.address_line1 ?? ""),
    addressLine2: String(row.address_line2 ?? ""),
    phone: String(row.phone ?? ""),
    supportEmail: String(row.support_email ?? ""),
    createdAt: String(row.created_at ?? ""),
    updatedAt: String(row.updated_at ?? ""),
  };
}

function mapStripeAccount(row: Record<string, unknown>): AuthorStripeAccount {
  return {
    userId: String(row.user_id),
    stripeLivemode: Boolean(row.stripe_livemode),
    stripeAccountId: String(row.stripe_account_id),
    accountApiVersion: "v2",
    onboardingStatus: row.onboarding_status === "complete" || row.onboarding_status === "pending" || row.onboarding_status === "restricted" ? row.onboarding_status : "not_started",
    merchantStatus: row.merchant_status === "active" || row.merchant_status === "pending" || row.merchant_status === "restricted" ? row.merchant_status : "unknown",
    chargesEnabled: Boolean(row.charges_enabled),
    payoutsEnabled: Boolean(row.payouts_enabled),
    requirementsStatus: row.requirements_status === "complete" || row.requirements_status === "pending" || row.requirements_status === "restricted" ? row.requirements_status : "unknown",
    lastSyncedAt: typeof row.last_synced_at === "string" ? row.last_synced_at : null,
    createdAt: String(row.created_at ?? ""),
    updatedAt: String(row.updated_at ?? ""),
  };
}

/** Caller must authenticate the supplied userId before invoking this server repository. */
export async function getAuthorSellerProfile(userId: string) {
  const ownerId = requireUserId(userId);
  const { data, error } = await requireSupabaseAdminClient()
    .from("author_seller_profiles")
    .select("*")
    .eq("user_id", ownerId)
    .maybeSingle();
  if (error) throw error;
  return data ? mapSellerProfile(data) : null;
}

/** Owner-scoped write primitive for the authenticated API layer; no bulk access. */
export async function saveAuthorSellerProfile(userId: string, profile: AuthorSellerProfileInput) {
  const ownerId = requireUserId(userId);
  const payload = {
    user_id: ownerId,
    seller_type: profile.sellerType,
    legal_name: profile.legalName.trim(),
    trade_name: profile.tradeName.trim(),
    representative_name: profile.representativeName.trim(),
    country_code: profile.countryCode.trim().toUpperCase(),
    postal_code: profile.postalCode.trim(),
    region: profile.region.trim(),
    city: profile.city.trim(),
    address_line1: profile.addressLine1.trim(),
    address_line2: profile.addressLine2.trim(),
    phone: profile.phone.trim(),
    support_email: profile.supportEmail.trim(),
  };
  const { data, error } = await requireSupabaseAdminClient()
    .from("author_seller_profiles")
    .upsert(payload, { onConflict: "user_id" })
    .select("*")
    .single();
  if (error) throw error;
  return mapSellerProfile(data);
}

export async function getAuthorStripeAccount(userId: string, stripeLivemode: boolean) {
  const ownerId = requireUserId(userId);
  const { data, error } = await requireSupabaseAdminClient()
    .from("author_stripe_accounts")
    .select("*")
    .eq("user_id", ownerId)
    .eq("stripe_livemode", stripeLivemode)
    .maybeSingle();
  if (error) throw error;
  return data ? mapStripeAccount(data) : null;
}

/** Server-controlled registry write. Never expose this primitive to the browser. */
export async function saveAuthorStripeAccount(
  userId: string,
  account: Pick<AuthorStripeAccount, "stripeLivemode" | "stripeAccountId" | "onboardingStatus" | "merchantStatus" | "chargesEnabled" | "payoutsEnabled" | "requirementsStatus">,
) {
  const ownerId = requireUserId(userId);
  const payload = {
    user_id: ownerId,
    stripe_livemode: account.stripeLivemode,
    stripe_account_id: account.stripeAccountId,
    account_api_version: "v2",
    onboarding_status: account.onboardingStatus,
    merchant_status: account.merchantStatus,
    charges_enabled: account.chargesEnabled,
    payouts_enabled: account.payoutsEnabled,
    requirements_status: account.requirementsStatus,
    last_synced_at: new Date().toISOString(),
  };
  const { data, error } = await requireSupabaseAdminClient()
    .from("author_stripe_accounts")
    .upsert(payload, { onConflict: "user_id,stripe_livemode" })
    .select("*")
    .single();
  if (error) throw error;
  return mapStripeAccount(data);
}
