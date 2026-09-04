import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (file: string) => fs.readFileSync(path.join(root, file), "utf8");
const migration = read("supabase/migrations/016_gate18d_plan_billing.sql");
const checkout = read("src/app/api/billing/checkout/route.ts");
const verify = read("src/app/api/billing/verify/route.ts");
const fulfillment = read("src/lib/server/planBillingFulfillment.ts");
const webhook = read("src/app/api/stripe/plan-webhook/route.ts");
const pricing = read("src/components/ver2/PricingShowcasePage.tsx");
const auth = read("src/components/AuthForm.tsx");
function assert(condition: unknown, message: string): asserts condition { if (!condition) throw new Error(`Plan billing verification failed: ${message}`); }

assert(migration.includes("plan_billing_transactions") && migration.includes("plan_entitlements"), "separate billing and entitlement tables exist");
assert(migration.includes("enable row level security") && migration.includes("revoke all on table public.plan_billing_transactions from anon, authenticated") && migration.includes("revoke all on table public.plan_entitlements from anon, authenticated"), "plan tables are server-only");
assert(migration.includes("stripe_checkout_session_id text not null unique") && migration.includes("plan_billing_publication_paid_idx"), "idempotency constraints exist");
assert(checkout.includes("requireAuthenticatedUser") && checkout.includes("configuredPlanPriceId") && checkout.includes("client_reference_id: user.id"), "checkout is server-authenticated and server-price controlled");
assert(checkout.includes("mode: definition.checkoutMode") && checkout.includes("metadata: { billing_type: \"webbookmaker_plan\""), "billing mode and metadata are explicit");
assert(fulfillment.includes("session.payment_status !== \"paid\"") && fulfillment.includes("session.livemode !== expectedLive") && fulfillment.includes("price.unit_amount !== definition.amount") && fulfillment.includes("price.id !== configuredPlanPriceId(planCode)"), "success verification validates paid/mode/amount/price");
assert(fulfillment.includes("authenticatedUserId && userId !== authenticatedUserId"), "other-user session is rejected");
assert(verify.includes("requireAuthenticatedUser") && verify.includes("fulfillPlanCheckoutSession"), "success route requires authenticated user and server fulfillment");
assert(webhook.includes("STRIPE_PLAN_WEBHOOK_SECRET") && webhook.includes("checkout.session.completed") && webhook.includes("invoice.paid") && webhook.includes("customer.subscription.deleted"), "plan webhook is separate and lifecycle-aware");
assert(pricing.includes('href: "/signup?plan=publish"') && pricing.includes('href: "/signup?plan=writer"'), "pricing links retain plan intent");
assert(auth.includes("/billing/start?plan=") && !auth.includes("現在準備中です"), "auth routes selected plans to billing start");
assert(!checkout.includes("stripeAccount") && !webhook.includes("fulfillCheckoutSession"), "plan billing does not use Connect fulfillment");
console.log("Plan billing verification passed.");
