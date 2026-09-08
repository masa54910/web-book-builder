import "server-only";

/**
 * `operation` is the legacy internal id for the ¥1,980 Plus plan.  It is
 * intentionally retained so existing subscriptions and entitlements remain
 * valid while the ¥980 Standard plan gets its own id.
 */
export const PLAN_CODES = ["publication", "operation_standard", "operation"] as const;
export type PlanCode = (typeof PLAN_CODES)[number];

export const PLAN_DEFINITIONS = {
  publication: {
    amount: 980,
    currency: "jpy",
    checkoutMode: "payment" as const,
    priceEnv: "STRIPE_PUBLICATION_PRICE_ID",
    publicationSlots: 1,
    salesEnabled: false,
  },
  operation_standard: {
    amount: 980,
    currency: "jpy",
    checkoutMode: "subscription" as const,
    priceEnv: "STRIPE_OPERATION_STANDARD_PRICE_ID",
    publicationSlots: 1,
    salesEnabled: true,
  },
  // Legacy `operation` transactions are the Plus plan.
  operation: {
    amount: 1980,
    currency: "jpy",
    checkoutMode: "subscription" as const,
    priceEnv: "STRIPE_OPERATION_PRICE_ID",
    publicationSlots: 10,
    salesEnabled: true,
  },
} satisfies Record<PlanCode, { amount: number; currency: string; checkoutMode: "payment" | "subscription"; priceEnv: string; publicationSlots: number; salesEnabled: boolean }>;

export function isPlanCode(value: unknown): value is PlanCode {
  return PLAN_CODES.includes(value as PlanCode);
}

export function isOperationPlan(planCode: PlanCode): planCode is "operation_standard" | "operation" {
  return planCode === "operation_standard" || planCode === "operation";
}

export function publicationSlotsForPlan(planCode: PlanCode) {
  return PLAN_DEFINITIONS[planCode].publicationSlots;
}

export function bookCreationLimitForPlans(planCodes: readonly PlanCode[], fallback: number) {
  if (planCodes.includes("operation")) return publicationSlotsForPlan("operation");
  if (planCodes.includes("operation_standard")) return publicationSlotsForPlan("operation_standard");
  if (planCodes.includes("publication")) return publicationSlotsForPlan("publication");
  return fallback;
}

export function configuredPlanPriceId(plan: PlanCode) {
  const value = process.env[PLAN_DEFINITIONS[plan].priceEnv]?.trim();
  if (!value || !/^price_[A-Za-z0-9]+$/.test(value)) throw new Error(`${PLAN_DEFINITIONS[plan].priceEnv} is not configured.`);
  return value;
}

export function expectedPlanFromPriceId(priceId: string) {
  for (const plan of PLAN_CODES) {
    if (configuredPlanPriceId(plan) === priceId) return plan;
  }
  return null;
}
