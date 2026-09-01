import assert from "node:assert/strict";
import { buildReaderPages } from "../src/lib/paginateText";
import { aggregatePageReach } from "../src/lib/readerAnalytics";
import { evaluateAnalyticsGuidance, resolveAnalyticsSuggestionTarget } from "../src/lib/editorGuidance/analyticsRules";
import type { BookContentBlock } from "../src/lib/bookProject";

const chapters = [{ id: "chapter-1", order: 1, title: "第一章", slug: "chapter-1", source: "fixture", body: "本文です。" }];
const blocks: BookContentBlock[] = [
  { id: "heading-1", type: "text", content: "第一章", structureRole: "chapter" },
  { id: "body-1", type: "text", content: "本文です。" },
  { id: "columns-1", type: "columns", ratio: "50-50", left: { blocks: [{ id: "left-1", type: "text", content: "左" }] }, right: { blocks: [{ id: "right-1", type: "text", content: "右" }] } },
  { id: "paywall-1", type: "paywall", previousBlockId: "columns-1", nextBlockId: "paid-1", chapterId: "heading-1" },
  { id: "paid-1", type: "text", content: "有料本文です。" },
];
const pagesA = buildReaderPages({ chapters, images: [], contentBlocks: blocks, charactersPerPage: 120, tableOfContentsItemsPerPage: 8 });
const pagesB = buildReaderPages({ chapters, images: [], contentBlocks: blocks, charactersPerPage: 120, tableOfContentsItemsPerPage: 8 });
assert.deepEqual(pagesA.map((page) => page.id), pagesB.map((page) => page.id), "ReaderPage ids must be deterministic");
const columns = pagesA.find((page) => page.kind === "columns");
assert.deepEqual(columns?.sourceBlockIds, ["columns-1", "left-1", "right-1"]);

const rows = [
  ...Array.from({ length: 20 }, (_, index) => ({ event_type: "view_start", session_id: `session-${index}` })),
  ...Array.from({ length: 20 }, (_, index) => ({ event_type: "page_reached", session_id: `session-${index}`, page_index: 2, reader_page_id: "chapter-1-text-1", source_block_id: "body-1", publication_revision: 1 })),
  ...Array.from({ length: 4 }, (_, index) => ({ event_type: "paywall_reached", session_id: `session-${index}`, page_index: 4, reader_page_id: "paywall-paywall-1", source_block_id: "paywall-1", publication_revision: 1 })),
  { event_type: "external_link_click", session_id: "session-0", link_type: "purchase" },
];
const summary = aggregatePageReach(rows);
assert.equal(summary.viewSessions.size, 20);
assert.equal(summary.pageReach[0]?.reachCount, 20);
assert.equal(summary.paywallReach, 4);
assert.equal(summary.purchaseClicks, 1);
const suggestions = evaluateAnalyticsGuidance({
  totalSessions: 20,
  publicationRevision: 1,
  pages: [
    { readerPageId: "p5", sourceBlockId: "body-1", pageIndex: 4, reachCount: 18, reachRate: 90, kind: "text" },
    { readerPageId: "p6", sourceBlockId: "body-2", pageIndex: 5, reachCount: 16, reachRate: 80, kind: "text" },
    { readerPageId: "p7", sourceBlockId: "body-3", pageIndex: 6, reachCount: 8, reachRate: 40, kind: "text" },
  ],
  paywall: { readerPageId: "paywall-1", sourceBlockId: "paywall-1", reachedSessions: 3, reachRate: 0.15 },
  purchaseLink: { clicks: 0, rate: 0 },
});
assert.equal(suggestions.length, 3);
assert.equal(evaluateAnalyticsGuidance({
  totalSessions: 20,
  publicationRevision: 1,
  pages: [
    { readerPageId: "chapter-chapter-1", pageIndex: 0, reachCount: 20, reachRate: 100 },
    { readerPageId: "chapter-chapter-2", pageIndex: 1, reachCount: 4, reachRate: 20 },
  ],
}).length, 0, "chapter title pages must not trigger body drop suggestions");
const immutableSnapshot = JSON.stringify(suggestions);
assert.equal(resolveAnalyticsSuggestionTarget(suggestions[0], 1, new Set(["body-3"])).canNavigate, true);
assert.equal(resolveAnalyticsSuggestionTarget(suggestions[0], 2, new Set(["body-3"])).message?.includes("以前の公開版"), true);
assert.equal(resolveAnalyticsSuggestionTarget(suggestions[0], 1, new Set()).canNavigate, false);
assert.equal(JSON.stringify(suggestions), immutableSnapshot, "guidance must not mutate its input/result");
assert.equal(evaluateAnalyticsGuidance({ totalSessions: 5, publicationRevision: 1, pages: [] }).length, 0);
const largeRows = Array.from({ length: 100_000 }, (_, index) => ({ event_type: index % 10 ? "page_reached" : "view_start", session_id: `s-${index % 1000}`, page_index: index % 40, reader_page_id: `p-${index % 40}`, publication_revision: 1 }));
const started = performance.now();
aggregatePageReach(largeRows);
assert.ok(performance.now() - started < 5000, "100k event aggregation should remain responsive");
console.log("Analytics guidance verification passed: stable IDs, mapping, reach, rules, legacy-safe sample, 100k performance.");
