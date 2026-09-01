import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { performance } from "node:perf_hooks";

import type { BookContentBlock } from "../src/lib/bookProject";
import type { DocumentStructure } from "../src/lib/documentStructure";
import {
  MAX_VISIBLE_EDITOR_GUIDANCE,
  PAYWALL_MIN_FREE_CONTENT_PAGES,
  TEXT_HEAVY_PAGE_CAPACITY_RATIO,
  evaluateEditorGuidance,
  selectVisibleEditorGuidance,
} from "../src/lib/editorGuidance/editorRules";
import { buildEditorGuidanceSnapshot } from "../src/lib/editorGuidance/editorSnapshot";
import type { EditorGuidanceIssue } from "../src/lib/editorGuidance/types";
import { EDITOR_GUIDANCE_ACTION_IDS } from "../src/lib/editorGuidance/actionIds";
import { actionDefinitionForIssueId } from "../src/lib/editorGuidance/actionRegistry";
import {
  resolveGuidanceNavigationTarget,
  resolveReaderPageNavigationTarget,
} from "../src/lib/editorGuidance/editorNavigation";
import type { ReaderPage } from "../src/lib/types";

const text = (id: string, content: string, extra: Partial<Extract<BookContentBlock, { type: "text" }>> = {}) => ({
  id,
  type: "text" as const,
  content,
  ...extra,
});

const structure = (chapterCount = 1, sectionCount = 0): DocumentStructure => ({
  chapters: Array.from({ length: chapterCount }, (_, chapterIndex) => ({
    id: `chapter-${chapterIndex + 1}`,
    title: `第${chapterIndex + 1}章`,
    level: 1 as const,
    marker: "",
    sections: Array.from({ length: sectionCount }, (_, sectionIndex) => ({
      id: `chapter-${chapterIndex + 1}-section-${sectionIndex + 1}`,
      parentId: `chapter-${chapterIndex + 1}`,
      title: `見出し${sectionIndex + 1}`,
      level: 2 as const,
      marker: "##",
    })),
  })),
});

const shortPage = (id: string, content = "読みやすい長さの本文です。", sourceBlockId = id): ReaderPage => ({
  id,
  kind: "text",
  chapterTitle: "本文",
  paragraphs: [content],
  sourceBlockIds: [sourceBlockId],
});

function snapshot(input: {
  blocks?: BookContentBlock[];
  pages?: ReaderPage[];
  documentStructure?: DocumentStructure;
  bodyCharacterCount?: number;
  charactersPerPage?: number;
}) {
  return buildEditorGuidanceSnapshot({
    title: "テスト作品",
    contentBlocks: input.blocks || [text("body", "通常の本文です。")],
    documentStructure: input.documentStructure || structure(),
    readerPages: input.pages || [shortPage("body-page", "通常の本文です。", "body")],
    bodyCharacterCount: input.bodyCharacterCount ?? 8,
    charactersPerPage: input.charactersPerPage ?? 380,
  });
}

const baseSnapshot = snapshot({
  blocks: [
    text("chapter", "# 第一章"),
    text("section", "## 小見出し"),
    text("body", "本文"),
    { id: "image", type: "image", storagePath: "book/image.webp", fileName: "image.webp", mimeType: "image/webp", width: 1200, height: 800, fitMode: "contain", pageMode: "inline", uploadState: "ready" },
    { id: "youtube", type: "youtube", videoId: "abcdefghijk", originalUrl: "https://www.youtube.com/watch?v=abcdefghijk" },
    { id: "paywall", type: "paywall" },
  ],
  pages: [
    { id: "cover", kind: "cover" },
    shortPage("body-page", "本文", "body"),
    { id: "paywall-page", kind: "paywall", sourceBlockId: "paywall", sourceBlockIds: ["paywall"] },
  ],
  documentStructure: structure(1, 1),
  bodyCharacterCount: 2,
});
assert.equal(baseSnapshot.summary.characterCount, 2, "character count comes from the existing editor calculation");
assert.equal(baseSnapshot.summary.chapterCount, 1, "chapter count reuses document structure");
assert.equal(baseSnapshot.summary.headingCount, 2, "heading count includes shared H1/H2/H3 recognition");
assert.equal(baseSnapshot.summary.pageCount, 3, "page count reuses supplied ReaderPage[]");
assert.equal(baseSnapshot.summary.imageCount, 1, "image count includes canonical image blocks");
assert.equal(baseSnapshot.summary.youtubeCount, 1, "YouTube count includes canonical video blocks");
assert.equal(baseSnapshot.summary.hasPaywall, true, "Paywall presence is included in the summary");

const ordinaryArticle = snapshot({
  blocks: [
    text("article-heading", "# お知らせ"),
    text("article-body", "通常の記事本文です。必要な情報を簡潔に紹介します。"),
  ],
  pages: [shortPage("article-page", "通常の記事本文です。必要な情報を簡潔に紹介します。", "article-body")],
  documentStructure: structure(1, 0),
  bodyCharacterCount: 26,
});
assert.deepEqual(evaluateEditorGuidance(ordinaryArticle), [], "ordinary articles are not warned without a clear issue");

const novelSnapshot = snapshot({
  blocks: [
    text("novel-chapter", "第一章　朝の駅"),
    text("novel-body", "始発のベルが、静かなホームに響いた。"),
  ],
  pages: [shortPage("novel-page", "始発のベルが、静かなホームに響いた。", "novel-body")],
  documentStructure: structure(1, 0),
  bodyCharacterCount: 20,
});
assert.deepEqual(evaluateEditorGuidance(novelSnapshot), [], "short novel pages are not over-diagnosed");

const columnsSnapshot = snapshot({
  blocks: [{
    id: "columns",
    type: "columns",
    ratio: "50-50",
    left: {
      blocks: [{ id: "column-image", type: "image", storagePath: "book/column.webp", fileName: "column.webp", mimeType: "image/webp", width: 900, height: 900, fitMode: "contain", pageMode: "inline", uploadState: "ready" }],
    },
    right: {
      blocks: [{ id: "column-youtube", type: "youtube", videoId: "abcdefghijk", originalUrl: "https://www.youtube.com/watch?v=abcdefghijk" }],
    },
  }],
  pages: [{ id: "columns-page", kind: "columns", chapterTitle: "本文", ratio: "50-50", columnsBlockId: "columns", left: [], right: [], sourceBlockIds: ["columns"] }],
  bodyCharacterCount: 0,
});
assert.equal(columnsSnapshot.summary.imageCount, 1, "images nested in columns are counted");
assert.equal(columnsSnapshot.summary.youtubeCount, 1, "YouTube blocks nested in columns are counted");

const immutableBlocks: BookContentBlock[] = [text("immutable", "# 見出し\n\n本文")];
const immutablePages: ReaderPage[] = [shortPage("immutable-page", "本文", "immutable")];
const blocksBefore = JSON.stringify(immutableBlocks);
const pagesBefore = JSON.stringify(immutablePages);
const immutableSnapshot = snapshot({ blocks: immutableBlocks, pages: immutablePages });
evaluateEditorGuidance(immutableSnapshot);
assert.equal(JSON.stringify(immutableBlocks), blocksBefore, "Canonical content blocks remain unchanged");
assert.equal(JSON.stringify(immutablePages), pagesBefore, "Reader pages remain unchanged");

const emptyHeadingIssues = evaluateEditorGuidance(snapshot({
  blocks: [text("empty-heading", "###   ")],
  pages: [shortPage("empty-page", "本文", "empty-heading")],
}));
assert.equal(emptyHeadingIssues[0]?.id, "heading.empty", "an explicit empty Markdown heading is detected");
assert.equal(emptyHeadingIssues[0]?.sourceBlockId, "empty-heading", "empty heading keeps its canonical block id");
assert.equal(emptyHeadingIssues[0]?.blocking, false, "guidance never blocks persistence");
assert.equal(emptyHeadingIssues[0]?.actionId, EDITOR_GUIDANCE_ACTION_IDS.blockFocus, "empty heading declares block navigation explicitly");

const heavyCharacters = Math.ceil(380 * TEXT_HEAVY_PAGE_CAPACITY_RATIO);
const longPageIssues = evaluateEditorGuidance(snapshot({
  blocks: [text("long", "長".repeat(heavyCharacters))],
  pages: [shortPage("long-page", "長".repeat(heavyCharacters), "long")],
  bodyCharacterCount: heavyCharacters,
}));
assert.equal(longPageIssues.some((issue) => issue.id === "page.text-heavy"), true, "one conservative full page is suggested");
assert.equal(longPageIssues[0]?.actionId, EDITOR_GUIDANCE_ACTION_IDS.pageFocus, "heavy pages declare page navigation explicitly");

const longSequenceIssues = evaluateEditorGuidance(snapshot({
  blocks: [text("long-1", "長".repeat(heavyCharacters)), text("long-2", "文".repeat(heavyCharacters))],
  pages: [
    shortPage("long-page-1", "長".repeat(heavyCharacters), "long-1"),
    shortPage("long-page-2", "文".repeat(heavyCharacters), "long-2"),
  ],
  bodyCharacterCount: heavyCharacters * 2,
}));
assert.equal(longSequenceIssues.some((issue) => issue.id === "page.text-heavy-sequence"), true, "consecutive full pages use the sequence rule");
assert.equal(longSequenceIssues.some((issue) => issue.id === "page.text-heavy"), false, "sequence output does not duplicate the single-page suggestion");

const earlyPaywallIssues = evaluateEditorGuidance(snapshot({
  blocks: [{ id: "early-paywall", type: "paywall" }, text("paid-body", "購入後の本文")],
  pages: [
    { id: "cover", kind: "cover" },
    { id: "early-paywall-page", kind: "paywall", sourceBlockId: "early-paywall", sourceBlockIds: ["early-paywall"] },
    shortPage("paid-page", "購入後の本文", "paid-body"),
  ],
}));
const paywallIssue = earlyPaywallIssues.find((issue) => issue.id === "paywall.free-section-short");
assert.ok(paywallIssue, "Paywall before all substantive pages is detected");
assert.equal(PAYWALL_MIN_FREE_CONTENT_PAGES, 1, "V1 flags only the clearly short zero-content boundary");
assert.equal(paywallIssue.severity, "suggestion", "an intentional early Paywall is advisory, not a warning");
assert.equal(paywallIssue.blocking, false, "Paywall guidance is non-blocking");
assert.equal(paywallIssue.actionId, EDITOR_GUIDANCE_ACTION_IDS.paywallFocus, "Paywall declares its own focus action");

const chapterlessEssay = snapshot({
  blocks: [text("essay", "章を設けない短いエッセイです。")],
  pages: [shortPage("essay-page", "章を設けない短いエッセイです。", "essay")],
  documentStructure: structure(1, 0),
  bodyCharacterCount: 15,
});
assert.deepEqual(evaluateEditorGuidance(chapterlessEssay), [], "chapter-less essays do not receive an H1 warning");
assert.equal(chapterlessEssay.summary.headingCount, 0, "fallback chapter is not counted as an explicit heading");

const imageBlocks: BookContentBlock[] = Array.from({ length: 8 }, (_, index) => ({
  id: `image-${index}`,
  type: "image" as const,
  storagePath: `book/image-${index}.webp`,
  fileName: `image-${index}.webp`,
  mimeType: "image/webp",
  width: 1200,
  height: 800,
  fitMode: "contain" as const,
  pageMode: "full-page" as const,
  uploadState: "ready" as const,
}));
const imagePages: ReaderPage[] = imageBlocks.map((block, index) => ({
  id: `image-page-${index}`,
  kind: "image",
  chapterTitle: "写真集",
  imageIndex: block.id,
  imageId: block.id,
  alt: "写真",
  caption: "",
  sourceBlockIds: [block.id],
}));
const imageHeavySnapshot = snapshot({ blocks: imageBlocks, pages: imagePages, bodyCharacterCount: 0 });
assert.equal(imageHeavySnapshot.summary.imageCount, 8, "image-heavy books count real image blocks");
assert.deepEqual(evaluateEditorGuidance(imageHeavySnapshot), [], "image-heavy books do not receive subjective image suggestions");

const unorderedIssues: EditorGuidanceIssue[] = [
  { id: "info", severity: "info", message: "info", scope: "book", dismissible: true, blocking: false },
  { id: "suggestion-late", severity: "suggestion", message: "suggestion", scope: "page", dismissible: true, blocking: false, documentOrder: 9 },
  { id: "warning", severity: "warning", message: "warning", scope: "heading", dismissible: true, blocking: false, documentOrder: 20 },
  { id: "suggestion-early", severity: "suggestion", message: "suggestion", scope: "page", dismissible: true, blocking: false, documentOrder: 2 },
];
const visibleIssues = selectVisibleEditorGuidance(unorderedIssues);
assert.equal(visibleIssues.length, MAX_VISIBLE_EDITOR_GUIDANCE, "UI selection is capped at three guidance items");
assert.deepEqual(visibleIssues.map((issue) => issue.id), ["warning", "suggestion-early", "suggestion-late"], "rules are ordered by severity then document position");

assert.equal(actionDefinitionForIssueId(EDITOR_GUIDANCE_ACTION_IDS.blockFocus, "heading.empty")?.buttonLabel, "見出しを見る", "heading action copy comes from the registry");
assert.equal(actionDefinitionForIssueId(EDITOR_GUIDANCE_ACTION_IDS.pageFocus, "page.text-heavy")?.buttonLabel, "このページを見る", "page action copy comes from the registry");
assert.equal(actionDefinitionForIssueId(EDITOR_GUIDANCE_ACTION_IDS.pageFocus, "page.text-heavy-sequence")?.buttonLabel, "最初のページを見る", "sequence action has specific copy");
assert.equal(actionDefinitionForIssueId(EDITOR_GUIDANCE_ACTION_IDS.paywallFocus, "paywall.free-section-short")?.buttonLabel, "Paywallを見る", "Paywall action copy comes from the registry");

const navigationBlocks: BookContentBlock[] = [
  text("before", "前の本文"),
  {
    id: "navigation-columns",
    type: "columns",
    ratio: "50-50",
    left: { blocks: [text("nested-heading", "###")] },
    right: { blocks: [text("nested-body", "カラム本文")] },
  },
  { id: "navigation-paywall", type: "paywall" },
];
const navigationPages: ReaderPage[] = [
  shortPage("before-page", "前の本文", "before"),
  shortPage("nested-page", "カラム本文", "nested-body"),
  { id: "navigation-paywall-page", kind: "paywall", sourceBlockId: "navigation-paywall", sourceBlockIds: ["navigation-paywall"] },
];
const navigationBlocksBefore = JSON.stringify(navigationBlocks);
const navigationPagesBefore = JSON.stringify(navigationPages);
assert.equal(resolveReaderPageNavigationTarget(navigationPages[1], navigationPages, navigationBlocks), "nested-body", "Mini Preview resolver reaches a Columns child");
assert.deepEqual(resolveGuidanceNavigationTarget({ ...emptyHeadingIssues[0], sourceBlockId: "nested-heading" }, navigationPages, navigationBlocks), { status: "handled", blockId: "nested-heading" }, "empty heading action reaches a nested Columns child");
assert.deepEqual(resolveGuidanceNavigationTarget({ ...longPageIssues[0], readerPageId: "nested-page", sourceBlockId: "nested-body" }, navigationPages, navigationBlocks), { status: "handled", blockId: "nested-body" }, "heavy page action uses the first valid source block");
assert.deepEqual(resolveGuidanceNavigationTarget({ ...longSequenceIssues[0], readerPageId: "nested-page", sourceBlockId: "nested-body" }, navigationPages, navigationBlocks), { status: "handled", blockId: "nested-body" }, "heavy sequence action reaches the first page");
assert.deepEqual(resolveGuidanceNavigationTarget({ ...paywallIssue, readerPageId: "navigation-paywall-page", sourceBlockId: "navigation-paywall" }, navigationPages, navigationBlocks), { status: "handled", blockId: "navigation-paywall" }, "Paywall action reaches the canonical Paywall block");
assert.deepEqual(resolveGuidanceNavigationTarget({ ...emptyHeadingIssues[0], sourceBlockId: "deleted-heading" }, navigationPages, navigationBlocks), { status: "not-found" }, "deleted targets return not-found without throwing");
assert.deepEqual(resolveGuidanceNavigationTarget({ ...longPageIssues[0], readerPageId: "old-page-id", sourceBlockId: "nested-body" }, navigationPages, navigationBlocks), { status: "handled", blockId: "nested-body" }, "changed pagination falls back to the stable canonical anchor");
assert.deepEqual(resolveGuidanceNavigationTarget({ ...longPageIssues[0], actionId: undefined }, navigationPages, navigationBlocks), { status: "unavailable" }, "issues without an action remain unavailable");
assert.equal(JSON.stringify(navigationBlocks), navigationBlocksBefore, "navigation leaves BookProject content blocks unchanged");
assert.equal(JSON.stringify(navigationPages), navigationPagesBefore, "navigation leaves ReaderPage data unchanged");

function performanceFixture(characterCount: number) {
  const content = "文".repeat(characterCount);
  const blocks = [text(`performance-${characterCount}`, content)];
  const pages = [shortPage(`performance-page-${characterCount}`, content, blocks[0].id)];
  const startedAt = performance.now();
  const result = snapshot({ blocks, pages, bodyCharacterCount: characterCount, charactersPerPage: characterCount });
  evaluateEditorGuidance(result);
  return performance.now() - startedAt;
}

const duration10k = performanceFixture(10_000);
const duration100k = performanceFixture(100_000);
const navigationStartedAt = performance.now();
resolveGuidanceNavigationTarget(
  { ...longPageIssues[0], readerPageId: "performance-page-100000", sourceBlockId: "performance-100000" },
  [shortPage("performance-page-100000", "文".repeat(100_000), "performance-100000")],
  [text("performance-100000", "文".repeat(100_000))],
);
const navigationDuration = performance.now() - navigationStartedAt;
assert.ok(duration10k < 5_000, `10k guidance evaluation should remain linear (${duration10k.toFixed(1)}ms)`);
assert.ok(duration100k < 5_000, `100k guidance evaluation should remain linear (${duration100k.toFixed(1)}ms)`);
assert.ok(navigationDuration < 1_000, `navigation resolution should be immediate (${navigationDuration.toFixed(1)}ms)`);

const guidanceSource = ["editorSnapshot.ts", "editorRules.ts"]
  .map((file) => fs.readFileSync(path.join(process.cwd(), "src", "lib", "editorGuidance", file), "utf8"))
  .join("\n");
assert.equal(guidanceSource.includes("buildReaderPages"), false, "guidance core must never trigger pagination");

console.log(`Editor guidance verification passed (10k ${duration10k.toFixed(1)}ms, 100k ${duration100k.toFixed(1)}ms, navigation ${navigationDuration.toFixed(1)}ms).`);
