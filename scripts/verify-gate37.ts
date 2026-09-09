import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const read = (file: string) => readFileSync(resolve(process.cwd(), file), "utf8");
const migration = read("supabase/migrations/022_ai_book_designer_plan_quota.sql");
const indexMigration = read("supabase/migrations/023_ai_book_designer_plan_usage_book_index.sql");
const route = read("src/app/api/ai/book-designer/route.ts");
const resolver = read("src/lib/server/aiBookDesignerQuota.ts");

assert.match(migration, /create table if not exists public\.ai_book_designer_plan_usage/);
assert.match(migration, /usage_date_jst date/);
assert.match(migration, /usage_month_jst date/);
assert.match(migration, /at time zone 'Asia\/Tokyo'/i);
assert.match(migration, /when 'free' then 1/);
assert.match(migration, /when 'free' then 3/);
assert.match(migration, /when 'publication' then 5/);
assert.match(migration, /p_plan_code = 'publication' then 20/);
assert.match(migration, /when 'operation_standard' then 5/);
assert.match(migration, /when 'operation_standard' then 20/);
assert.match(migration, /when 'operation' then 10/);
assert.match(migration, /when 'operation' then 40/);
assert.match(migration, /when p_plan_code = 'publication' then p_book_id/);
assert.match(migration, /pg_advisory_xact_lock/);
assert.match(migration, /legacy_daily_count/);
assert.match(migration, /revoke all on function public\.consume_ai_book_designer_plan_quota/);
assert.match(migration, /grant execute on function public\.consume_ai_book_designer_plan_quota[\s\S]*to service_role/);
assert.match(indexMigration, /ai_book_designer_plan_usage_book_fk_idx/);

assert.match(route, /resolveAIBookDesignerQuotaScope/);
assert.match(route, /consume_ai_book_designer_plan_quota/);
assert.doesNotMatch(route, /AI_BOOK_DESIGNER_DAILY_LIMIT/);
assert.match(route, /reason === "monthly"/);
assert.match(route, /reason === "lifetime"/);
assert.match(route, /quotaScope\.bookId/);
assert.match(resolver, /plan_entitlements/);
assert.match(resolver, /\.eq\("status", "active"\)/);
assert.match(resolver, /\.eq\("owner_id", userId\)/);
assert.match(resolver, /operation_standard/);
assert.match(resolver, /operation/);
assert.match(resolver, /publication/);

const jstDate = (iso: string) => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Tokyo", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(iso));
assert.equal(jstDate("2026-09-30T14:59:59Z"), "2026-09-30");
assert.equal(jstDate("2026-09-30T15:00:00Z"), "2026-10-01");
assert.equal(jstDate("2026-08-31T14:59:59Z"), "2026-08-31");
assert.equal(jstDate("2026-08-31T15:00:00Z"), "2026-09-01");

console.log("Gate37 plan quota verification passed.");
