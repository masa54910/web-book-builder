import "server-only";

export const PLAN_CODES = ["publication", "operation"] as const;
export type PlanCode = (typeof PLAN_CODES)[number];

export const PLAN_DEFINITIONS = {
  publication: { amount: 980, currency: "jpy", checkoutMode: "payment" as const, priceEnv: "STRIPE_PUBLICATION_PRICE_ID" },
  operation: { amount: 1980, currency: "jpy", checkoutMode: "subscription" as const, priceEnv: "STRIPE_OPERATION_PRICE_ID" },
} satisfies Record<PlanCode, { amount: number; currency: string; checkoutMode: "payment" | "subscription"; priceEnv: string }>;

export function isPlanCode(value: unknown): value is PlanCode {
  return value === "publication" || value === "operation";
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
