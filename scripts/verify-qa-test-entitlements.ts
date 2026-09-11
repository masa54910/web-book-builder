import assert from "node:assert/strict";
import fs from "node:fs";

const migration = fs.readFileSync("supabase/migrations/20260911090000_qa_test_entitlements.sql", "utf8");
const resolver = fs.readFileSync("src/lib/server/qaEntitlement.ts", "utf8");
const plan = fs.readFileSync("src/lib/server/planBillingRepository.ts", "utf8");
const fullQuota = fs.readFileSync("src/lib/server/aiBookDesignerQuota.ts", "utf8");
const fullRoute = fs.readFileSync("src/app/api/ai/book-designer/full/route.ts", "utf8");
const adminRoute = fs.readFileSync("src/app/api/admin/qa-entitlements/route.ts", "utf8");

assert.match(migration, /create table public\.qa_test_entitlements/);
assert.match(migration, /create table public\.qa_test_entitlement_audit/);
assert.match(migration, /enable row level security/);
assert.match(migration, /revoke all on table public\.qa_test_entitlements from anon, authenticated/);
assert.match(migration, /revoke all on table public\.qa_test_entitlement_audit from anon, authenticated/);
assert.match(migration, /plan_code.*'qa'/);
assert.match(migration, /allow_full_design/);
assert.match(migration, /expires_at > now\(\)/);
assert.match(resolver, /isEnabled/);
assert.match(plan, /getQATestEntitlement/);
assert.match(plan, /qa\?\.allowPublish/);
assert.match(fullQuota, /capability: "quick" \| "full"/);
assert.match(fullQuota, /planCode: "qa"/);
assert.match(fullRoute, /qaEntitlement\.allowAICritic/);
assert.match(adminRoute, /authenticateAdminRequest/);
assert.match(adminRoute, /qa_test_entitlement_audit/);
console.log("QA test entitlement verification passed.");
