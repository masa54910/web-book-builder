import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const migrationPath = path.join(
  process.cwd(),
  "supabase",
  "migrations",
  "008_reconcile_analytics_schema.sql",
);
const sql = fs.readFileSync(migrationPath, "utf8");
const normalized = sql.toLowerCase();
const withoutComments = normalized
  .replace(/--.*$/gmu, "")
  .replace(/\/\*[\s\S]*?\*\//gu, "");

assert.match(normalized, /begin;/u);
assert.match(normalized, /commit;/u);
assert.match(normalized, /to_regclass\('public\.book_analytics_events'\)/u);
assert.match(normalized, /create table public\.book_analytics_events/u);
assert.match(normalized, /public\.books\(id\) on delete cascade/u);
assert.match(normalized, /publication_revision integer/u);
assert.match(normalized, /reader_page_id text/u);
assert.match(normalized, /source_block_id text/u);
assert.match(normalized, /chapter_id text/u);
assert.match(normalized, /link_type text/u);
for (const eventType of [
  "view_start",
  "reached_25",
  "reached_50",
  "reached_75",
  "completed",
  "share_click",
  "external_link_click",
  "chapter_reached",
  "page_reached",
  "paywall_reached",
]) {
  assert.match(normalized, new RegExp(`'${eventType}'`, "u"));
}
for (const indexName of [
  "analytics_events_book_created_idx",
  "analytics_events_book_type_idx",
  "analytics_events_book_referrer_idx",
  "analytics_events_book_device_idx",
  "analytics_events_book_reader_page_idx",
  "analytics_events_book_revision_idx",
]) {
  assert.match(normalized, new RegExp(`create index if not exists ${indexName}`, "u"));
}
assert.match(normalized, /enable row level security/u);
assert.match(normalized, /create policy analytics_events_select_owner/u);
assert.match(normalized, /revoke insert on table public\.book_analytics_events from anon, authenticated/u);
assert.doesNotMatch(normalized, /create table public\.book_analytics_daily/u);
assert.doesNotMatch(normalized, /drop table/u);
assert.doesNotMatch(normalized, /truncate\s/u);
assert.doesNotMatch(withoutComments, /^\s*(update|delete|insert)\s/im);
assert.doesNotMatch(normalized, /service_role_key|stripe_secret|webhook_secret/u);

console.log("Analytics schema migration static validation: PASS");
