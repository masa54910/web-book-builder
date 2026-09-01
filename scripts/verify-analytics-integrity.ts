import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { buildReaderPages } from "../src/lib/paginateText";
import { validateAnalyticsEventPayload, type PublishedAnalyticsRegistry } from "../src/lib/analyticsEventValidation";
import type { BookContentBlock } from "../src/lib/bookProject";

const blocks: BookContentBlock[] = [
  { id: "heading-1", type: "text", content: "第一章", structureRole: "chapter" },
  { id: "free-1", type: "text", content: "無料本文です。" },
  { id: "columns-1", type: "columns", ratio: "50-50", left: { blocks: [{ id: "column-left-1", type: "text", content: "左" }] }, right: { blocks: [{ id: "column-right-1", type: "text", content: "右" }] } },
  { id: "paywall-1", type: "paywall", previousBlockId: "columns-1", nextBlockId: "paid-1", chapterId: "chapter-1" },
  { id: "paid-1", type: "text", content: "有料本文です。" },
];
const pages = buildReaderPages({
  chapters: [{ id: "chapter-1", order: 1, title: "第一章", slug: "chapter-1", source: "fixture", body: "" }],
  images: [],
  contentBlocks: blocks,
  charactersPerPage: 380,
  tableOfContentsItemsPerPage: 6,
  showPaywallPage: true,
});
const registry: PublishedAnalyticsRegistry = {
  bookId: "book-1",
  publicationRevision: 3,
  pages,
  chapterIds: new Set(["chapter-1"]),
  chapterIdsByTitle: new Map([["第一章", "chapter-1"]]),
  paywallBlockIds: new Set(["paywall-1"]),
};
const pageIndex = pages.findIndex((page) => page.sourceBlockIds?.includes("free-1"));
const page = pages[pageIndex];
assert.ok(page && pageIndex >= 0);

function payload(overrides: Partial<Parameters<typeof validateAnalyticsEventPayload>[0]> = {}) {
  return {
    bookId: "book-1", sessionId: "session-123", eventType: "page_reached", publicationRevision: 3,
    readerPageId: page.id, sourceBlockId: "free-1", pageIndex, totalPages: pages.length,
    ...overrides,
  };
}

assert.equal(validateAnalyticsEventPayload(payload(), registry).ok, true, "valid page event accepted");
assert.equal(validateAnalyticsEventPayload(payload({ bookId: "other-book" }), registry).ok, false, "wrong book rejected");
assert.equal(validateAnalyticsEventPayload(payload({ readerPageId: "chapter-1-text-999" }), registry).ok, false, "unknown page rejected");
assert.equal(validateAnalyticsEventPayload(payload({ sourceBlockId: "paid-1" }), registry).ok, false, "wrong source block rejected");
assert.equal(validateAnalyticsEventPayload(payload({ chapterId: "chapter-2" }), registry).ok, false, "wrong chapter rejected");
assert.equal(validateAnalyticsEventPayload(payload({ publicationRevision: 2 }), registry).ok, false, "wrong publication revision rejected");
assert.equal(validateAnalyticsEventPayload(payload({ pageIndex: pageIndex + 1 }), registry).ok, false, "page index mismatch rejected");
const columnsPageIndex = pages.findIndex((candidate) => candidate.kind === "columns");
const columnsPage = pages[columnsPageIndex];
assert.ok(columnsPage);
assert.equal(validateAnalyticsEventPayload({ ...payload(), readerPageId: columnsPage.id, sourceBlockId: "column-left-1", pageIndex: columnsPageIndex }, registry).ok, true, "Columns child source accepted");
assert.equal(validateAnalyticsEventPayload({ ...payload({ eventType: "view_start" }), readerPageId: null, sourceBlockId: null, pageIndex: null }, registry).ok, true, "view start does not require a page");

const paywallPageIndex = pages.findIndex((candidate) => candidate.kind === "paywall");
const paywallPage = pages[paywallPageIndex];
assert.ok(paywallPage);
assert.equal(validateAnalyticsEventPayload({ ...payload({ eventType: "paywall_reached" }), readerPageId: paywallPage.id, sourceBlockId: "paywall-1", pageIndex: paywallPageIndex }, registry).ok, true, "real paywall block accepted");
assert.equal(validateAnalyticsEventPayload({ ...payload({ eventType: "paywall_reached" }), readerPageId: paywallPage.id, sourceBlockId: "free-1", pageIndex: paywallPageIndex }, registry).ok, false, "non-paywall source rejected");
assert.equal(validateAnalyticsEventPayload({ ...payload({ eventType: "external_link_click" }), readerPageId: null, sourceBlockId: null, pageIndex: null, linkType: "purchase" }, registry).ok, true, "purchase link allowlisted");
assert.equal(validateAnalyticsEventPayload({ ...payload({ eventType: "external_link_click" }), readerPageId: null, sourceBlockId: null, pageIndex: null, linkType: "javascript" }, registry).ok, false, "unknown link type rejected");
assert.equal(validateAnalyticsEventPayload({ ...payload({ eventType: "not-a-real-event" }) }, registry).ok, false, "unknown event type rejected");

const migrationDir = join(process.cwd(), "supabase", "migrations");
const migrationFiles = readdirSync(migrationDir).filter((name) => /^\d+_.+\.sql$/u.test(name));
const versions = migrationFiles.map((name) => name.match(/^(\d+)_/u)![1]);
assert.equal(new Set(versions).size, versions.length, "migration numeric versions must be unique");
assert.ok(migrationFiles.some((name) => name.startsWith("006_gatec_")), "existing Gate C 006 migration preserved");
assert.ok(migrationFiles.some((name) => name.startsWith("007_gate17s_analytics_")), "analytics dimensions follow Gate C 006");
const analyticsMigration = readFileSync(join(migrationDir, migrationFiles.find((name) => name.startsWith("007_gate17s_analytics_"))!), "utf8");
assert.match(analyticsMigration, /publication_revision/u);
assert.match(analyticsMigration, /add column if not exists reader_page_id text/u);
assert.match(analyticsMigration, /analytics_events_book_reader_page_idx/u);
assert.match(analyticsMigration, /analytics_events_book_revision_idx/u);
assert.match(analyticsMigration, /revoke insert on table public\.book_analytics_events from anon, authenticated/u);
const initialMigration = readFileSync(join(migrationDir, "001_initial_beta_schema.sql"), "utf8");
assert.match(initialMigration, /create table if not exists public\.book_analytics_events/u, "fresh chain creates analytics events before dimensions");
assert.match(initialMigration, /create or replace function public\.set_updated_at/u, "sales migration trigger prerequisite exists in the initial chain");
const dimensionsMigration = readFileSync(join(migrationDir, "002_profile_preferences_and_analytics_dimensions.sql"), "utf8");
assert.match(dimensionsMigration, /alter table public\.book_analytics_events/u);
const salesMigration = readFileSync(join(migrationDir, "005_gatec_phase1_sales_and_purchases.sql"), "utf8");
assert.doesNotMatch(salesMigration, /drop\s|truncate\s|preview_last_page|alter table public\.(books|auth\.users)|update public\.(books|auth\.users)/iu, "sales foundation is additive and does not alter existing book/user data");
assert.match(salesMigration, /create table if not exists public\.book_sales_settings/u);
assert.match(salesMigration, /create table if not exists public\.book_purchases/u);
assert.match(salesMigration, /enable row level security/iu);
assert.match(salesMigration, /revoke all on table public\.book_purchases from anon, authenticated/u);
console.log("Analytics integrity verification passed: published page membership, source/paywall anchors, revision/index/link validation, and unique migration chain.");
