import assert from "node:assert/strict";
import { buildReaderPages } from "../src/lib/paginateText";
import { contentBlocksToRawText, extractChaptersFromText, type BookContentBlock } from "../src/lib/bookProject";
import { runRuleBasedLayoutCritic } from "../src/lib/layoutCritic";

// Synthetic, non-user content: reproduce the legacy orphan, then verify
// opt-in Full Design pagination without changing the source blocks.
const blocks: BookContentBlock[] = [
  { id: "audit-chapter", type: "text", content: "# 検証章" },
  { id: "audit-heading", type: "text", content: "## 小見出しの直後に長文がある場合を確認します" },
  { id: "audit-body", type: "text", content: "安全検証用の本文です。".repeat(80) },
];
const before = JSON.stringify(blocks);
const pages = buildReaderPages({
  chapters: extractChaptersFromText(contentBlocksToRawText(blocks), "検証", blocks),
  images: [], contentBlocks: blocks, charactersPerPage: 380, tableOfContentsItemsPerPage: 6,
});
const orphanPages = pages.filter((page) => page.kind === "text" &&
  page.paragraphs.length > 0 && page.paragraphs.every((paragraph) => /^#{2,3}\s/u.test(paragraph)));
const critic = runRuleBasedLayoutCritic(blocks);
const safePages = buildReaderPages({
  chapters: extractChaptersFromText(contentBlocksToRawText(blocks), "検証", blocks),
  images: [], contentBlocks: blocks, charactersPerPage: 380, tableOfContentsItemsPerPage: 6,
  layoutSafetyEnabled: true,
});
assert.equal(safePages.filter((page) => page.kind === "text" && page.paragraphs.length > 0 &&
  page.paragraphs.every((paragraph) => /^#{2,3}\s/u.test(paragraph))).length, 0);
const legacyText = pages.flatMap((page) => page.kind === "text" ? page.paragraphs : []).join("");
const safeText = safePages.flatMap((page) => page.kind === "text" ? page.paragraphs : []).join("");
assert.equal(safeText, legacyText, "no manuscript addition/deletion/reorder");
assert.equal(JSON.stringify(blocks), before);
assert.equal(orphanPages.length, 1, "reproduce isolated H2 page before a long paragraph");
assert.equal(critic.passed, true, "current block-only critic misses page-boundary orphan");
console.log(JSON.stringify({
  status: "LEGACY_REPRODUCED_FULL_DESIGN_FIXED",
  orphanPageIds: orphanPages.map((page) => page.id),
  criticPassedIncorrectly: critic.passed,
  contentUnchanged: JSON.stringify(blocks) === before,
}));
