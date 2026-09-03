import "server-only";

import type Stripe from "stripe";

import { evaluateSellerProfileCompleteness, evaluateStripeSellerReadiness, type AuthorSellerProfile, type AuthorStripeAccount, type SellerType } from "@/lib/sellerConnect";
import { getAuthorSellerProfile, getAuthorStripeAccount, saveAuthorStripeAccount } from "@/lib/server/sellerConnectRepository";
import { requireStripeClient } from "@/lib/server/stripe";
import { expectedStripeLivemode } from "@/lib/server/stripeEnvironment";

export type ConnectedAccountSummary = Pick<AuthorStripeAccount, "stripeAccountId" | "stripeLivemode" | "onboardingStatus" | "merchantStatus" | "chargesEnabled" | "payoutsEnabled" | "requirementsStatus">;

function clean(value: string | undefined) {
  return value?.trim() || undefined;
}

/** Build the v2 Account request without accepting a mode or account id from the browser. */
export function buildConnectedAccountParams(profile: AuthorSellerProfile): Stripe.V2.Core.AccountCreateParams {
  const entityType: "individual" | "company" = profile.sellerType === "company" ? "company" : "individual";
  return {
    dashboard: "full",
    contact_email: clean(profile.supportEmail),
    contact_phone: clean(profile.phone),
    display_name: clean(profile.tradeName) ?? clean(profile.legalName),
    identity: {
      country: profile.countryCode.trim().toUpperCase(),
      entity_type: entityType,
    },
    configuration: {
      merchant: {
        capabilities: { card_payments: { requested: true } },
      },
    },
    defaults: {
      currency: "jpy",
      locales: ["ja"],
      responsibilities: { fees_collector: "stripe", losses_collector: "stripe" },
    },
    include: ["configuration.merchant", "requirements", "identity"],
    metadata: { webbookmaker_user_id: profile.userId },
  };
}

type AccountShape = {
  id?: unknown;
  livemode?: unknown;
  configuration?: unknown;
  requirements?: unknown;
};

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? value as Record<string, unknown> : {};
}

function status(value: unknown): "active" | "pending" | "restricted" | "unknown" {
  if (value === "active" || value === "pending" || value === "restricted") return value;
  return "unknown";
}

export function summarizeConnectedAccount(account: AccountShape, stripeLivemode: boolean): ConnectedAccountSummary {
  const merchant = record(record(account.configuration).merchant);
  const capabilities = record(merchant.capabilities);
  const merchantStatus = status(record(capabilities.card_payments).status);
  const payoutStatus = status(record(record(capabilities.stripe_balance).payouts).status);
  const requirements = record(account.requirements);
  const requirement = record(record(requirements.summary).minimum_deadline).status;
  const requirementsStatus = requirement === "past_due" ? "restricted" : requirement === "currently_due" || requirement === "eventually_due" ? "pending" : merchantStatus === "active" ? "complete" : "unknown";
  const onboardingStatus = merchantStatus === "active" && requirementsStatus === "complete" ? "complete" : merchantStatus === "restricted" || requirementsStatus === "restricted" ? "restricted" : "pending";
  return {
    stripeAccountId: typeof account.id === "string" ? account.id : "",
    stripeLivemode,
    onboardingStatus,
    merchantStatus,
    chargesEnabled: merchantStatus === "active",
    payoutsEnabled: payoutStatus === "active",
    requirementsStatus,
  };
}

function siteOrigin(fallbackOrigin: string) {
  const configured = clean(process.env.NEXT_PUBLIC_SITE_URL);
  const candidate = configured || fallbackOrigin;
  const url = new URL(candidate);
  if (url.protocol !== "https:" && url.hostname !== "localhost" && url.hostname !== "127.0.0.1") {
    throw new Error("Site URL must use HTTPS.");
  }
  return url.origin;
}

async function ensureAccount(userId: string, profile: AuthorSellerProfile) {
  const stripeLivemode = expectedStripeLivemode();
  const existing = await getAuthorStripeAccount(userId, stripeLivemode);
  if (existing) return existing;
  const stripe = requireStripeClient();
  const response = await stripe.v2.core.accounts.create(buildConnectedAccountParams(profile), {
    idempotencyKey: `connect-account:${userId}:${stripeLivemode ? "live" : "test"}`,
  });
  if (typeof response.livemode === "boolean" && response.livemode !== stripeLivemode) {
    throw new Error("Stripe account mode does not match the configured environment.");
  }
  const summary = summarizeConnectedAccount(response, stripeLivemode);
  return saveAuthorStripeAccount(userId, summary);
}

export async function createHostedOnboardingLink(userId: string, fallbackOrigin: string) {
  const profile = await getAuthorSellerProfile(userId);
  const completeness = evaluateSellerProfileCompleteness(profile);
  if (!profile || !completeness.complete) {
    return { kind: "incomplete" as const, missingFields: completeness.missingFields };
  }
  const account = await ensureAccount(userId, profile);
  const origin = siteOrigin(fallbackOrigin);
  const stripe = requireStripeClient();
  const response = await stripe.v2.core.accountLinks.create({
    account: account.stripeAccountId,
    use_case: {
      type: "account_onboarding",
      account_onboarding: {
        configurations: ["merchant"],
        collection_options: { fields: "eventually_due" },
        refresh_url: `${origin}/settings?connect=refresh`,
        return_url: `${origin}/settings?connect=return`,
      },
    },
  });
  return { kind: "link" as const, url: response.url, account: evaluateStripeSellerReadiness(account) };
}

export async function readConnectedAccountStatus(userId: string) {
  const stripeLivemode = expectedStripeLivemode();
  const existing = await getAuthorStripeAccount(userId, stripeLivemode);
  if (!existing) return { account: null, readiness: evaluateStripeSellerReadiness(null) };
  const stripe = requireStripeClient();
  const response = await stripe.v2.core.accounts.retrieve(existing.stripeAccountId, {
    include: ["configuration.merchant", "requirements", "identity"],
  });
  if (typeof response.livemode === "boolean" && response.livemode !== stripeLivemode) {
    throw new Error("Stripe account mode does not match the configured environment.");
  }
  const account = await saveAuthorStripeAccount(userId, summarizeConnectedAccount(response, stripeLivemode));
  return { account, readiness: evaluateStripeSellerReadiness(account) };
}

export function sellerTypeForConnect(sellerType: SellerType) {
  return sellerType === "company" ? "company" : "individual";
}
