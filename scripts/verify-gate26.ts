import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (file: string) => fs.readFileSync(path.join(root, file), "utf8");
const plan = read("src/lib/planBilling.ts");
const repository = read("src/lib/server/planBillingRepository.ts");
const sales = read("src/lib/server/connectPaymentLinks.ts");
const route = read("src/app/api/connect/sales/route.ts");
const panel = read("src/components/ConnectSalesPanel.tsx");
const migration = read("supabase/migrations/016_gate18d_plan_billing.sql");

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`Gate26 verification failed: ${message}`);
}

assert(plan.includes('publication: { amount: 980, currency: "jpy", checkoutMode: "payment"') && plan.includes('operation: { amount: 1980, currency: "jpy", checkoutMode: "subscription"'), "existing plan definitions remain authoritative");
assert(repository.includes("hasPublicationEntitlement") && repository.includes('eq("plan_code", "publication")') && repository.includes('eq("status", "active")'), "publication entitlement gate is server-side");
assert(sales.includes("hasPublicationEntitlement") && sales.includes("新しい作品販売には出版プランが必要です"), "new Connect sales require publication entitlement");
assert(sales.includes("existing.amount === input.amount && existing.currency === input.currency"), "existing sales are reused without destructive replacement");
assert(route.includes("paymentLinkUrl") && route.includes("canCreateSale") && route.includes("stripeConnected"), "book sale status and Payment Link are server-provided");
assert(panel.includes('option value="jpy"') && panel.includes('option value="usd"') && panel.includes('href="/settings"'), "editor exposes currency and settings guidance");
for (const legacyField of ["支払時期", "デジタル配信時期", "返品・返金条件", "追加費用", "申込期限"]) assert(!panel.includes(legacyField), `legacy field removed from editor: ${legacyField}`);
assert(migration.includes("plan_billing_transactions") && migration.includes("plan_entitlements"), "existing billing schema remains in place");
console.log("Gate26 verification passed.");
