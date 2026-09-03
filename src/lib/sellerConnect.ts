export type SellerType = "individual" | "company";

export type OnboardingStatus = "not_started" | "pending" | "complete" | "restricted";
export type MerchantStatus = "unknown" | "pending" | "active" | "restricted";
export type RequirementsStatus = "unknown" | "pending" | "complete" | "restricted";

export type AuthorSellerProfile = {
  userId: string;
  sellerType: SellerType;
  legalName: string;
  tradeName: string;
  representativeName: string;
  countryCode: string;
  postalCode: string;
  region: string;
  city: string;
  addressLine1: string;
  addressLine2: string;
  phone: string;
  supportEmail: string;
  createdAt: string;
  updatedAt: string;
};

export type AuthorSellerProfileInput = Omit<AuthorSellerProfile, "createdAt" | "updatedAt">;

export type SellerCompletenessField =
  | "sellerType"
  | "legalName"
  | "representativeName"
  | "countryCode"
  | "postalCode"
  | "region"
  | "city"
  | "addressLine1"
  | "phone"
  | "supportEmail";

export type SellerCompletenessResult = {
  complete: boolean;
  missingFields: SellerCompletenessField[];
};

export type AuthorStripeAccount = {
  userId: string;
  stripeLivemode: boolean;
  stripeAccountId: string;
  accountApiVersion: "v2";
  onboardingStatus: OnboardingStatus;
  merchantStatus: MerchantStatus;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  requirementsStatus: RequirementsStatus;
  lastSyncedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type StripeConnectionStatus = {
  connected: boolean;
  onboardingComplete: boolean;
  merchantActive: boolean;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  missingRequirements: string[];
};

/** Book-level terms shown to readers before a Connect purchase. */
export type SalesLegalTerms = {
  paymentMethod: string;
  paymentTiming: string;
  digitalDeliveryTiming: string;
  refundPolicy: string;
  additionalCosts: string;
  applicationDeadline?: string;
};

export type SalesLegalTermsResult = {
  complete: boolean;
  missingFields: Array<Exclude<keyof SalesLegalTerms, "applicationDeadline">>;
};

function present(value: string | undefined | null) {
  return typeof value === "string" && value.trim().length > 0;
}

/**
 * Computes readiness from the stored profile on every call. No persisted
 * is_complete flag is used, so edits cannot leave a stale readiness value.
 */
export function evaluateSellerProfileCompleteness(
  profile: Partial<AuthorSellerProfileInput> | null | undefined,
): SellerCompletenessResult {
  if (!profile) {
    return {
      complete: false,
      missingFields: ["sellerType", "legalName", "countryCode", "postalCode", "region", "city", "addressLine1", "phone", "supportEmail"],
    };
  }

  const missingFields: SellerCompletenessField[] = [];
  if (profile.sellerType !== "individual" && profile.sellerType !== "company") missingFields.push("sellerType");
  if (!present(profile.legalName)) missingFields.push("legalName");
  if (profile.sellerType === "company" && !present(profile.representativeName)) missingFields.push("representativeName");
  if (!present(profile.countryCode)) missingFields.push("countryCode");
  if (!present(profile.postalCode)) missingFields.push("postalCode");
  if (!present(profile.region)) missingFields.push("region");
  if (!present(profile.city)) missingFields.push("city");
  if (!present(profile.addressLine1)) missingFields.push("addressLine1");
  if (!present(profile.phone)) missingFields.push("phone");
  if (!present(profile.supportEmail)) missingFields.push("supportEmail");
  return { complete: missingFields.length === 0, missingFields };
}

export function evaluateStripeSellerReadiness(
  account: Partial<AuthorStripeAccount> | null | undefined,
): StripeConnectionStatus {
  const missingRequirements: string[] = [];
  if (!account) {
    return {
      connected: false,
      onboardingComplete: false,
      merchantActive: false,
      chargesEnabled: false,
      payoutsEnabled: false,
      missingRequirements: ["registry", "onboarding", "merchant", "charges", "payouts"],
    };
  }
  if (!present(account.stripeAccountId)) missingRequirements.push("registry");
  if (account.onboardingStatus !== "complete") missingRequirements.push("onboarding");
  if (account.merchantStatus !== "active") missingRequirements.push("merchant");
  if (account.chargesEnabled !== true) missingRequirements.push("charges");
  if (account.payoutsEnabled !== true) missingRequirements.push("payouts");
  return {
    connected: present(account.stripeAccountId),
    onboardingComplete: account.onboardingStatus === "complete",
    merchantActive: account.merchantStatus === "active",
    chargesEnabled: account.chargesEnabled === true,
    payoutsEnabled: account.payoutsEnabled === true,
    missingRequirements,
  };
}

export function evaluateSalesLegalTerms(
  terms: Partial<SalesLegalTerms> | null | undefined,
): SalesLegalTermsResult {
  const required = ["paymentMethod", "paymentTiming", "digitalDeliveryTiming", "refundPolicy", "additionalCosts"] as const;
  const missingFields = required.filter((field) => !present(terms?.[field]));
  return { complete: missingFields.length === 0, missingFields: [...missingFields] };
}
