import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (file: string) => fs.readFileSync(path.join(root, file), "utf8");
const onboarding = read("src/lib/server/connectOnboarding.ts");
const profileRoute = read("src/app/api/connect/profile/route.ts");
const onboardingRoute = read("src/app/api/connect/onboarding/route.ts");
const statusRoute = read("src/app/api/connect/status/route.ts");
const panel = read("src/components/SellerConnectPanel.tsx");

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`Connect verification failed: ${message}`);
}

assert(onboarding.includes("stripe.v2.core.accounts.create"), "Accounts v2 create is used");
assert(onboarding.includes("stripe.v2.core.accounts.retrieve"), "Accounts v2 retrieve is used");
assert(onboarding.includes("stripe.v2.core.accountLinks.create"), "Account Links v2 is used");
assert(onboarding.includes('dashboard: "full"'), "full dashboard is requested");
assert(onboarding.includes('fees_collector: "stripe"') && onboarding.includes('losses_collector: "stripe"'), "Stripe collects fees and losses");
assert(onboarding.includes("card_payments: { requested: true }"), "merchant card_payments capability is requested");
assert(onboarding.includes("capabilities.stripe_balance") && onboarding.includes(".payouts).status"), "payout readiness uses stripe_balance.payouts capability");
assert(!onboarding.includes("type: \"express\""), "legacy Express account type is absent");
assert(!onboarding.includes("charges_enabled") && !onboarding.includes("payouts_enabled"), "deprecated Stripe account fields are not used for API readiness");
assert(onboarding.includes("expectedStripeLivemode()"), "Stripe mode is server configuration, not client input");
assert(onboarding.includes("idempotencyKey"), "account creation is idempotent");
assert(onboarding.includes('configurations: ["merchant"]'), "hosted onboarding targets merchant configuration");
assert(profileRoute.includes("requireAuthenticatedUser") && onboardingRoute.includes("requireAuthenticatedUser") && statusRoute.includes("requireAuthenticatedUser"), "all routes authenticate callers");
assert(panel.includes("/api/connect/profile") && panel.includes("/api/connect/onboarding"), "settings panel uses the server API");
assert(!onboarding.includes("sk_live_") && !onboarding.includes("sk_test_"), "secret key literals are absent");

console.log("Connect onboarding verification passed.");
