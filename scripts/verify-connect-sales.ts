import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (file: string) => fs.readFileSync(path.join(root, file), "utf8");
const migration = read("supabase/migrations/012_gate18c3_connect_book_sales.sql");
const salesModule = read("src/lib/server/connectPaymentLinks.ts");
const route = read("src/app/api/connect/sales/route.ts");
const fulfillment = read("src/lib/server/purchaseFulfillment.ts");
const webhook = read("src/app/api/stripe/connect-webhook/route.ts");
const panel = read("src/components/ConnectSalesPanel.tsx");
function assert(condition: unknown, message: string): asserts condition { if (!condition) throw new Error(`Connect sales verification failed: ${message}`); }

assert(migration.includes("create table if not exists public.connect_book_sales"), "separate Connect sales registry exists");
assert(migration.includes("stripe_account_id") && migration.includes("stripe_product_id") && migration.includes("stripe_price_id") && migration.includes("stripe_payment_link_id"), "all Stripe object identities are persisted");
assert(migration.includes("unique (book_id, stripe_livemode)"), "book and mode are unique");
assert(migration.includes("enable row level security") && migration.includes("revoke all on table public.connect_book_sales from anon, authenticated"), "registry is server-only");
assert(salesModule.includes("stripe.products.create") && salesModule.includes("stripe.prices.create") && salesModule.includes("stripe.paymentLinks.create"), "Product, Price, and Payment Link are created");
assert(salesModule.includes("stripeAccount: account.stripeAccountId"), "all Stripe objects use connected account context");
assert(salesModule.includes("application_fee_amount") === false && salesModule.includes("application_fee_percent") === false, "application fee remains zero");
assert(salesModule.includes("idempotencyKey") && salesModule.includes("connect-payment-link"), "creation is idempotent");
assert(salesModule.includes("webbookmaker_book_id") && salesModule.includes("webbookmaker_owner_id"), "book and owner metadata are attached");
assert(salesModule.includes("evaluateSalesLegalTerms") && salesModule.includes("legalTerms"), "book-level legal terms are validated and persisted");
assert(panel.includes("返品・返金条件") && panel.includes("デジタル配信時期"), "sales UI collects reader-facing legal terms");
assert(route.includes("requireAuthenticatedUser"), "sales route authenticates owner");
assert(fulfillment.includes("fulfillConnectedCheckoutSession") && fulfillment.includes("expectedStripeAccountId"), "connected fulfillment validates account boundary");
assert(fulfillment.includes("listConnectStripeAccountIds") && fulfillment.includes("isStripeResourceMissing"), "platform verification falls back to registered Connect accounts for direct charges");
assert(webhook.includes("STRIPE_CONNECT_WEBHOOK_SECRET") && webhook.includes("event.account") && webhook.includes("fulfillConnectedCheckoutSession") && webhook.includes("recordConnectWebhookEvent"), "Connect webhook is separate and account-scoped");
assert(!salesModule.includes("STRIPE_SECRET_KEY") && !salesModule.includes("sk_live_"), "secrets are not embedded");
console.log("Connect sales verification passed.");
