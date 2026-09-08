import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const read = (file: string) => fs.readFileSync(path.join(process.cwd(), file), "utf8");
const plan = read("src/lib/planBilling.ts");
const pricing = read("src/components/ver2/PricingShowcasePage.tsx");
const checkout = read("src/app/billing/start/BillingStartClient.tsx");
const sales = read("src/lib/server/connectPaymentLinks.ts");
const publishGate = read("src/app/api/connect/publish-gate/route.ts");
const migration = read("supabase/migrations/019_gate20_pricing_plan_alignment.sql");

assert.match(plan, /operation_standard/);
assert.match(plan, /STRIPE_OPERATION_STANDARD_PRICE_ID/);
assert.match(plan, /publicationSlots: 1/);
assert.match(plan, /publicationSlots: 10/);
assert.match(pricing, /運用スタンダード/);
assert.match(pricing, /運用プラス/);
assert.match(pricing, /1冊分/);
assert.match(pricing, /10冊分/);
assert.match(pricing, /作品販売/);
assert.match(checkout, /operation_standard/);
assert.match(checkout, /operation_plus/);
assert.match(sales, /hasOperationSalesEntitlement/);
assert.match(publishGate, /canPublishNewBook/);
assert.match(migration, /operation_standard/);
assert.doesNotMatch(sales, /hasPublicationEntitlement/);

console.log("Pricing finalization verification passed.");
