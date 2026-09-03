import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (file: string) => fs.readFileSync(path.join(root, file), "utf8");
const gate = read("src/app/api/connect/publish-gate/route.ts");
const consent = read("src/app/api/connect/consent/route.ts");
const webhook = read("src/app/api/stripe/connect-webhook/route.ts");
const ops = read("src/lib/server/connectWebhookOperations.ts");
const reader = read("src/lib/server/publishedReader.ts");
const paywall = read("src/components/PaywallPage.tsx");
const preflight = read("src/lib/server/connectPreflight.ts");
const migrationC4 = read("supabase/migrations/013_gate18c4_sales_consent.sql");
const migrationC5 = read("supabase/migrations/014_gate18c5_connect_webhook_events.sql");
const migrationLegal = read("supabase/migrations/015_gate18c4_book_sales_legal_terms.sql");

function assert(condition: unknown, message: string): asserts condition { if (!condition) throw new Error(`Connect compliance verification failed: ${message}`); }
assert(migrationC4.includes("author_sales_consents") && migrationC4.includes("terms_version") && migrationC4.includes("accepted_at"), "consent foundation exists");
assert(migrationC5.includes("connect_webhook_events") && migrationC5.includes("primary key") && migrationC5.includes("charge.refunded") && migrationC5.includes("charge.dispute.created"), "idempotent webhook ledger exists");
assert(migrationLegal.includes("payment_method") && migrationLegal.includes("refund_policy") && migrationLegal.includes("additional_costs"), "book-level sales legal terms columns exist");
assert(consent.includes("CONNECT_TERMS_VERSION") && consent.includes("accepted !== true"), "consent requires explicit acceptance and version");
assert(gate.includes("evaluateSellerProfileCompleteness") && gate.includes("evaluateStripeSellerReadiness") && gate.includes("getSalesConsent") && gate.includes("getConnectBookSale"), "paid publish gate checks seller, consent, Stripe, sales, and book");
assert(gate.includes("Object.values(checks).every(Boolean)"), "publish gate is server-side");
assert(gate.includes("evaluateSalesLegalTerms") && gate.includes("legalTerms"), "paid publish requires complete book-level legal terms");
assert(webhook.includes("charge.refunded") && webhook.includes("charge.dispute.created") && webhook.includes("recordConnectWebhookEvent"), "Connect webhook handles refunds and disputes separately");
assert(ops.includes("revoked_at") && ops.includes("stripe_account_id"), "refund/dispute revocation is account-scoped");
assert(reader.includes("getConnectBookSale") && reader.includes("stripeAccount"), "reader supports Connect payment links without changing legacy lookup");
assert(paywall.includes("販売者情報・返品/返金条件を見る"), "reader exposes seller disclosure before purchase");
assert(paywall.includes("paymentMethod") && paywall.includes("refundPolicy") && paywall.includes("additionalCosts"), "reader disclosure includes book-level legal terms");
assert(preflight.includes("readyForPayment") && preflight.includes("paymentLinkReachable") && !preflight.includes("checkout.sessions.create"), "preflight validates without starting Checkout");
assert(!gate.includes("STRIPE_SECRET_KEY") && !webhook.includes("sk_live_"), "secret values are absent");
console.log("Connect compliance verification passed.");
