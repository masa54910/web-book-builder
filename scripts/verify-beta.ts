import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import { canReadPublishedBook } from "../src/lib/accessControl";
import {
  buildBookProject,
  contentBlocksFromLegacy,
  contentBlocksToRawText,
  ensureUniqueContentBlockIds,
  extractChaptersFromText,
  normalizePastedText,
  type BookContentBlock,
  type UploadedBookImage,
} from "../src/lib/bookProject";
import { parseBookProjectJson } from "../src/lib/bookProjectNormalization";
import { BETA_LIMITS } from "../src/lib/limits";
import { createSlugCandidate, validateSlug } from "../src/lib/slug";
import { validateImportFile, validateZipPath } from "../src/lib/fileImport";
import { buildReaderPages } from "../src/lib/paginateText";
import { buildReaderFolioById, readerPageNumberLabel } from "../src/lib/readerFolio";
import type { ImageManifestRow } from "../src/lib/types";
import { countContentCharacters, countUserCharacters } from "../src/lib/characterCount";
import { createPendingImageBlock, insertImageBlocksAtCursor, insertYouTubeBlockAtCursor } from "../src/lib/inlineContentBlocks";
import { parseYouTubeUrl, youtubeEmbedUrl } from "../src/lib/youtube";
import { resolveSafeInternalReturnPath } from "../src/lib/returnTo";
import { validateRequiredBookFields } from "../src/lib/editorValidation";
import { computeInlineImagePopoverLayout } from "../src/lib/inlineImagePopover";
import { buildEditorDraftFields, seedFromDraftFields, type EditorDraftState } from "../src/lib/editorDraftState";
import {
  DEFAULT_COVER_DESIGN,
  COVER_TITLE_IMAGE_SCALE_MIN,
  COVER_TITLE_IMAGE_SCALE_MAX,
  COVER_AUTHOR_SCALE_MAX,
  normalizeCoverDesign,
  normalizeCoverTitleOverride,
} from "../src/lib/coverDesign";
import { buildCanonicalBookPayload, canonicalPayloadToBookProjectInput } from "../src/lib/canonicalBook";
import { normalizePageAdjustments, removePageAdjustment, upsertPageAdjustment } from "../src/lib/pageAdjustments";
import {
  AUTOSAVE_MAX_AGE_MS,
  deleteAutosaveDraft,
  loadAutosaveDraft,
  saveAutosaveDraft,
} from "../src/lib/browserBookStorage";
import {
  HOME_DRAFT_STORAGE_KEY,
  deleteHomeDraft,
  loadHomeDraft,
  saveHomeDraft,
} from "../src/lib/homeDraftStorage";
import { buildFacebookShareUrl, buildLineShareTemplate, buildLineShareUrl, buildLineWebShareUrl, buildShareTemplate, buildXShareTemplate, buildXShareUrl, NOTE_NEW_POST_URL } from "../src/lib/shareTemplates";
import { buildReaderFacebookShareUrl, buildReaderLineShareUrl, buildReaderLineWebShareUrl, buildReaderShareTemplate, buildReaderXShareUrl, READER_NOTE_NEW_POST_URL } from "../src/lib/readerShareTemplates";
import { xIntentUrl } from "../src/lib/promotion";
import { applyTextMark, normalizeTextMarks, sliceTextMarks, TEXT_COLORS, TEXT_COLOR_LABELS } from "../src/lib/textStyles";
import { smartFormatContentBlocks } from "../src/lib/smartFormat";

const styledText = "通常の太字と色";
const boldMarks = applyTextMark(styledText, [], 3, 5, { bold: true });
assert.deepEqual(normalizeTextMarks(styledText, boldMarks), [{ start: 3, end: 5, bold: true }]);
const coloredMarks = applyTextMark(styledText, boldMarks, 5, 7, { color: "#1677B8", fontSize: "large" });
assert.ok(coloredMarks.some((mark) => mark.bold && mark.start === 3 && mark.end === 5));
assert.ok(coloredMarks.some((mark) => mark.color === "#1677B8" && mark.fontSize === "large"));
assert.deepEqual(sliceTextMarks(coloredMarks, 3, 7).map((mark) => ({ ...mark })), [
  { start: 0, end: 2, bold: true },
  { start: 2, end: 4, color: "#1677B8", fontSize: "large" },
]);
assert.deepEqual(TEXT_COLORS, ["#111827", "#1677B8", "#EF4444", "#EAB308", "#667085"]);
assert.deepEqual(Object.values(TEXT_COLOR_LABELS), ["黒", "青", "赤", "黄色", "グレー"]);

const duplicateBlocks: BookContentBlock[] = [
  { id: "paragraph-001", type: "text", content: "one" },
  { id: "paragraph-001", type: "text", content: "two" },
  {
    id: "image-001",
    type: "image",
    storagePath: "images/example.jpg",
    publicUrl: "https://example.com/example.jpg",
    fileName: "example.jpg",
    mimeType: "image/jpeg",
    width: 100,
    height: 100,
    fitMode: "contain",
    pageMode: "inline",
    uploadState: "ready",
  },
  {
    id: "image-001",
    type: "image",
    storagePath: "images/example-2.jpg",
    fileName: "example-2.jpg",
    mimeType: "image/jpeg",
    width: 100,
    height: 100,
    fitMode: "contain",
    pageMode: "inline",
    uploadState: "pending",
  },
  { id: "youtube-001", type: "youtube", videoId: "dQw4w9WgXcQ", originalUrl: "https://youtu.be/dQw4w9WgXcQ" },
  { id: "youtube-001", type: "youtube", videoId: "dQw4w9WgXcQ", originalUrl: "https://youtu.be/dQw4w9WgXcQ" },
];
const repairedBlocks = ensureUniqueContentBlockIds(duplicateBlocks);
assert.equal(new Set(repairedBlocks.map((block) => block.id)).size, repairedBlocks.length, "content block ids must be unique");
assert.equal(repairedBlocks[0].id, "paragraph-001", "the first existing id should be preserved");
assert.equal(repairedBlocks[1].type, "text");
assert.equal(repairedBlocks[3].type, "image");
assert.equal((repairedBlocks[3] as Extract<BookContentBlock, { type: "image" }>).uploadState, "pending", "stale pending image state should be preserved for recovery");
assert.deepEqual(normalizePastedText("\uFEFFone\r\ntwo\n\n\nthree  \n"), "one\ntwo\n\nthree\n");
const manyBlocks = ensureUniqueContentBlockIds(Array.from({ length: 128 }, (_, index) => ({
  id: index % 2 ? "paragraph-duplicate" : `paragraph-${index}`,
  type: "text" as const,
  content: String(index),
})));
assert.equal(new Set(manyBlocks.map((block) => block.id)).size, 128, "100+ blocks should remain unique");

const smartFormat = smartFormatContentBlocks([
  { id: "paragraph-smart", type: "text", content: "第1章 はじまり\n駅を出ると潮の匂いがした。\n\n海辺の町\n\n1. 箇条書き項目" },
]);
assert.equal(smartFormat.chapters, 1, "explicit chapter labels should become chapters");
assert.equal(smartFormat.subheadings, 1, "isolated short lines should become subheadings");
assert.ok(smartFormat.blocks.some((block) => block.type === "text" && block.structureRole === "chapter"));
assert.ok(smartFormat.blocks.some((block) => block.type === "text" && block.structureRole === "subheading"));
assert.ok(!smartFormat.blocks.some((block) => block.type === "text" && block.content.startsWith("1. ") && block.structureRole === "chapter"), "numbered lists must remain paragraphs");
assert.equal(new Set(smartFormat.blocks.map((block) => block.id)).size, smartFormat.blocks.length, "Smart Format must keep block ids unique");
const mediaLeadingSmartFormat = smartFormatContentBlocks([
  { id: "image-before", type: "image", storagePath: "images/cover.jpg", fileName: "cover.jpg", mimeType: "image/jpeg", width: 100, height: 100, fitMode: "contain", pageMode: "inline", uploadState: "ready" },
  { id: "paragraph-after-image", type: "text", content: "第2章\n本文" },
]);
assert.equal(mediaLeadingSmartFormat.blocks[1]?.id, "paragraph-after-image", "Smart Format must preserve the first id of each text block");

function blockSignature(blocks: BookContentBlock[]) {
  return blocks.map((block) =>
    block.type === "text"
      ? `text:${block.content.replace(/\n+/g, " ").trim()}`
      : block.type === "image"
        ? `image:${block.id}`
        : block.type === "youtube"
          ? `youtube:${block.id}:${block.videoId}`
          : `paywall:${block.id}`,
  );
}

function uploadedImagesFromBlocks(blocks: BookContentBlock[]) {
  return blocks
    .filter((block): block is Extract<BookContentBlock, { type: "image" }> => block.type === "image")
    .map<UploadedBookImage>((block, index) => ({
      id: block.id,
      fileName: block.fileName,
      dataUrl: block.publicUrl || block.storagePath || `data:image/png;base64,${block.id}`,
      mimeType: block.mimeType,
      size: 0,
      caption: block.caption || "",
      insertChapter: "1",
      orderInChapter: index + 1,
    }));
}

const projectResult = buildBookProject({
  title: "ベータ検証",
  subtitle: "",
  author: "Verifier",
  description: "",
  publisherName: "",
  publishedAt: "",
  copyrightText: "",
  rawText: "見出しなし本文です。",
  bindingDirection: "rtl",
  theme: "classic",
  charactersPerPage: 380,
  tableOfContentsItemsPerPage: 6,
  images: [],
});

assert.equal(projectResult.ok, true, "BookProject should build");
if (projectResult.ok) {
  assert.equal(projectResult.project.chapters.length, 1, "No-heading manuscript becomes one chapter");
  assert.equal(projectResult.project.chapters[0]?.title, "ベータ検証");
  assert.ok(parseBookProjectJson(projectResult.project), "BookProject can be normalized");
}

assert.equal(createSlugCandidate(" Hello  Web Book! "), "hello-web-book");
assert.equal(createSlugCandidate("A"), "book", "Short slugs must use the production-safe fallback");
assert.equal(createSlugCandidate("AB"), "book", "Two-character slugs must use the production-safe fallback");
assert.equal(validateSlug("ab").length > 0, true, "Two-character slugs must be rejected");
assert.equal(validateSlug("dashboard").includes("予約"), true, "Reserved slug must be rejected");
assert.equal(validateSlug("safe-book-01"), "", "Safe slug should pass");

const japaneseAuthorProject = buildBookProject({
  title: "日本語タイトル",
  subtitle: "",
  author: "山田太郎",
  description: "",
  publisherName: "",
  publishedAt: "",
  copyrightText: "",
  rawText: "日本語だけの作者名でも保存できる本文です。",
  bindingDirection: "rtl",
  theme: "classic",
  charactersPerPage: 380,
  tableOfContentsItemsPerPage: 6,
  images: [],
});
assert.equal(japaneseAuthorProject.ok, true, "Japanese-only author names should build");
if (japaneseAuthorProject.ok) {
  assert.match(
    japaneseAuthorProject.project.config.authorProfile?.handle || "",
    /^[a-z0-9][a-z0-9_-]{1,39}$/,
    "Internal author handle must satisfy production constraint",
  );
}

assert.equal(validateZipPath("manuscript/book.txt"), "");
assert.ok(validateZipPath("../secret.txt"), "Zip slip path should be rejected");
assert.ok(validateZipPath("/absolute.txt"), "Absolute zip path should be rejected");

const txt = new File(["hello"], "book.txt", { type: "text/plain" });
assert.equal(validateImportFile(txt), "");
const pdf = new File(["%PDF-1.7"], "book.pdf", { type: "application/pdf" });
assert.equal(validateImportFile(pdf), "");
const script = new File(["alert(1)"], "x.js", { type: "application/javascript" });
assert.ok(validateImportFile(script), "Unsupported import extension should be rejected");

assert.equal(
  canReadPublishedBook({ status: "published", visibility: "public" }),
  true,
  "Published public book should be readable",
);
assert.equal(
  canReadPublishedBook({ status: "draft", visibility: "public" }),
  false,
  "Draft public book should not be readable by visitors",
);
assert.equal(
  canReadPublishedBook({ status: "draft", visibility: "private", isOwner: true }),
  true,
  "Owner can read own draft",
);

assert.equal(BETA_LIMITS.maxBooksPerUser, 5);
assert.equal(BETA_LIMITS.maxCharactersPerBook, 200_000);
assert.equal(countUserCharacters("あ😀い"), 3, "Grapheme-aware character count should treat emoji as one character");
assert.equal(
  countContentCharacters([
    { type: "text", content: "本文\nです" },
    { type: "image" },
  ]),
  5,
  "Body character count should exclude image blocks",
);

const paragraphAdjustmentPages = buildReaderPages({
  chapters: [{ id: "chapter-01", order: 1, title: "調整", slug: "adjustment", source: "test", body: "夜の街を歩くと窓の灯りが静かに路地を照らしていた。" }],
  images: [],
  contentBlocks: [{ id: "paragraph-001", type: "text", content: "夜の街を歩くと窓の灯りが静かに路地を照らしていた。" }],
  pageAdjustments: [{ blockId: "paragraph-001", displayTextOverride: "夜の街を歩くと\n窓の灯りが静かに\n路地を照らしていた。" }],
  charactersPerPage: 380,
  tableOfContentsItemsPerPage: 6,
});
assert.equal(
  paragraphAdjustmentPages.find((page) => page.kind === "text")?.paragraphs[0],
  "夜の街を歩くと\n窓の灯りが静かに\n路地を照らしていた。",
  "Paragraph display override should preserve original characters and apply line breaks",
);

const pageBreakPages = buildReaderPages({
  chapters: [{ id: "chapter-01", order: 1, title: "Breaks", slug: "breaks", source: "test", body: "First paragraph\n\nSecond paragraph" }],
  images: [],
  contentBlocks: [
    { id: "text-first", type: "text", content: "First paragraph" },
    { id: "text-second", type: "text", content: "Second paragraph" },
  ],
  pageAdjustments: [{ blockId: "text-first", pageBreakAfter: true }],
  charactersPerPage: 380,
  tableOfContentsItemsPerPage: 6,
});
const pageBreakTextPages = pageBreakPages.filter((page) => page.kind === "text");
assert.equal(
  pageBreakPages.some((page) => page.kind === "pageBreak"),
  false,
  "A forced break must not create a synthetic blank page",
);
assert.equal(pageBreakTextPages.length, 2, "A forced break should start the next block on a new text page");
assert.equal(pageBreakTextPages[0]?.paragraphs.join(""), "First paragraph");
assert.equal(pageBreakTextPages[1]?.paragraphs.join(""), "Second paragraph");
assert.ok(pageBreakTextPages[0]?.sourceBlockIds?.includes("text-first"), "Text pages should expose their source block IDs");
assert.ok(pageBreakTextPages[1]?.sourceBlockIds?.includes("text-second"), "The page after a break should expose its source block ID");

const youtubePages = buildReaderPages({
  chapters: [{
    id: "chapter-youtube",
    order: 1,
    title: "Video",
    slug: "youtube",
    source: "test",
    body: "Before\n\n[[youtube:youtube-001|dQw4w9WgXcQ]]\n\nAfter",
  }],
  images: [],
  contentBlocks: [
    { id: "youtube-before", type: "text", content: "Before" },
    {
      id: "youtube-001",
      type: "youtube",
      videoId: "dQw4w9WgXcQ",
      originalUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    },
    { id: "youtube-after", type: "text", content: "After" },
  ],
  charactersPerPage: 380,
  tableOfContentsItemsPerPage: 6,
});
const youtubePage = youtubePages.find((page) => page.kind === "youtube");
assert.equal(youtubePage?.videoId, "dQw4w9WgXcQ", "Pagination should create an independent YouTube page");
assert.deepEqual(youtubePage?.sourceBlockIds, ["youtube-001"]);
assert.equal(youtubePage?.displaySize, "medium", "Legacy YouTube blocks should retain full-page behavior with a safe default size");

const inlineYoutubePages = buildReaderPages({
  chapters: [{
    id: "chapter-inline-youtube",
    order: 1,
    title: "Inline video",
    slug: "inline-youtube",
    source: "test",
    body: "Before\n\n[[youtube:youtube-inline|dQw4w9WgXcQ|inline|small]]\n\nAfter",
  }],
  images: [],
  contentBlocks: [
    { id: "youtube-inline-before", type: "text", content: "Before" },
    {
      id: "youtube-inline",
      type: "youtube",
      videoId: "dQw4w9WgXcQ",
      originalUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      displayMode: "inline",
      displaySize: "small",
    },
    { id: "youtube-inline-after", type: "text", content: "After" },
  ],
  charactersPerPage: 1200,
  tableOfContentsItemsPerPage: 6,
});
assert.equal(inlineYoutubePages.some((page) => page.kind === "youtube"), false, "Inline YouTube should not create an independent page");
const inlineYoutubeTextPage = inlineYoutubePages.find(
  (page): page is Extract<(typeof inlineYoutubePages)[number], { kind: "text" }> =>
    page.kind === "text" && page.paragraphs.some((paragraph) => paragraph.startsWith("[[inline-youtube:")),
);
assert.ok(inlineYoutubeTextPage, "Inline YouTube should be represented inside a text page");
assert.equal(inlineYoutubeTextPage?.paragraphs.includes("Before"), true);
assert.equal(inlineYoutubeTextPage?.paragraphs.includes("After"), true);

const folioPages = buildReaderPages({
  chapters: [{ id: "chapter-01", order: 1, title: "番号", slug: "folio", source: "test", body: "本文" }],
  images: [],
  charactersPerPage: 380,
  tableOfContentsItemsPerPage: 6,
});
const folioById = buildReaderFolioById(folioPages);
assert.equal(readerPageNumberLabel(folioPages[0], folioById), "表紙", "Mini Preview should label the cover separately");
assert.equal(readerPageNumberLabel(folioPages[1], folioById), "01", "Mini Preview should share the Reader folio numbering");
assert.equal(readerPageNumberLabel({ id: "manual-break", kind: "pageBreak", sourcePageId: "title" }, folioById), "改ページ");
assert.equal(readerPageNumberLabel(folioPages.at(-2)!, folioById), String(folioPages.length - 2).padStart(2, "0"), "Colophon should retain its Reader folio");

const longText = "長文本文".repeat(7500);
const longTextPages = buildReaderPages({
  chapters: [{ id: "chapter-01", order: 1, title: "長文", slug: "long", source: "test", body: longText }],
  images: [],
  charactersPerPage: 380,
  tableOfContentsItemsPerPage: 6,
});
const renderedLongText = longTextPages
  .filter((page) => page.kind === "text")
  .flatMap((page) => page.paragraphs)
  .join("");
assert.equal(renderedLongText, longText, "Long Mini Preview input should retain all paginated text");

const insertionSource: BookContentBlock[] = [{ id: "text-001", type: "text", content: "冒頭本文" }];
const pendingNodes = [
  createPendingImageBlock("pending-img-1", "a.png", "image/png"),
  createPendingImageBlock("pending-img-2", "b.png", "image/png"),
];
const insertionResult = insertImageBlocksAtCursor({
  blocks: insertionSource,
  paragraphIndex: 0,
  cursorOffset: 2,
  imageBlocks: pendingNodes,
});
assert.deepEqual(
  blockSignature(insertionResult.nextBlocks),
  ["text:冒頭", "image:pending-img-1", "image:pending-img-2", "text:本文"],
  "Images should be inserted at cursor position inside the paragraph",
);

const youtubeUrls = [
  "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
  "https://youtu.be/dQw4w9WgXcQ?t=12",
  "https://www.youtube.com/shorts/dQw4w9WgXcQ",
  "https://m.youtube.com/watch?v=dQw4w9WgXcQ",
  "youtube.com/watch?v=dQw4w9WgXcQ",
];
for (const url of youtubeUrls) {
  assert.equal(parseYouTubeUrl(url)?.videoId, "dQw4w9WgXcQ", `YouTube URL should parse: ${url}`);
}
assert.equal(parseYouTubeUrl("https://example.com/watch?v=dQw4w9WgXcQ"), null);
assert.equal(parseYouTubeUrl("javascript:alert(1)"), null);
assert.equal(youtubeEmbedUrl("dQw4w9WgXcQ").startsWith("https://www.youtube-nocookie.com/embed/"), true);

const youtubeInsertion = insertYouTubeBlockAtCursor({
  blocks: [{ id: "youtube-source-text", type: "text", content: "before-after" }],
  paragraphIndex: 0,
  cursorOffset: 7,
  youtubeBlock: {
    id: "youtube-001",
    type: "youtube",
    videoId: "dQw4w9WgXcQ",
    originalUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
  },
});
assert.deepEqual(
  blockSignature(youtubeInsertion),
  ["text:before-", "youtube:youtube-001:dQw4w9WgXcQ", "text:after"],
  "YouTube block should be inserted at the current cursor without disturbing surrounding text",
);

const orderedBlocks: BookContentBlock[] = [
  { id: "text-001", type: "text", content: "最初の段落" },
  {
    id: "img-001",
    type: "image",
    storagePath: "data:image/png;base64,AAAA",
    fileName: "img-001.png",
    mimeType: "image/png",
    width: 1200,
    height: 800,
    caption: "キャプション1",
    altText: "alt-1",
    fitMode: "contain",
    pageMode: "full-page",
    displaySize: "large",
    uploadState: "ready",
  },
  { id: "text-002", type: "text", content: "中間の段落" },
  {
    id: "youtube-001",
    type: "youtube",
    videoId: "dQw4w9WgXcQ",
    originalUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    displayMode: "inline",
    displaySize: "small",
  },
  {
    id: "img-002",
    type: "image",
    storagePath: "data:image/png;base64,BBBB",
    fileName: "img-002.png",
    mimeType: "image/png",
    width: 1200,
    height: 800,
    caption: "キャプション2",
    altText: "alt-2",
    fitMode: "contain",
    pageMode: "full-page",
    uploadState: "ready",
  },
  { id: "text-003", type: "text", content: "最後の段落" },
];
const orderedImages = uploadedImagesFromBlocks(orderedBlocks);
const rawTextFromBlocks = contentBlocksToRawText(orderedBlocks);
const restoredBlocks = contentBlocksFromLegacy(rawTextFromBlocks, orderedImages);
assert.deepEqual(
  blockSignature(restoredBlocks),
  blockSignature(orderedBlocks),
  "Text and image order should survive serialization and restoration",
);
const restoredOrderedImage = restoredBlocks.find(
  (block): block is Extract<BookContentBlock, { type: "image" }> => block.type === "image" && block.id === "img-001",
);
const restoredOrderedYoutube = restoredBlocks.find(
  (block): block is Extract<BookContentBlock, { type: "youtube" }> => block.type === "youtube" && block.id === "youtube-001",
);
assert.equal(restoredOrderedImage?.displaySize, "large", "Image display size should survive raw text round trip");
assert.equal(restoredOrderedYoutube?.displayMode, "inline", "YouTube display mode should survive raw text round trip");
assert.equal(restoredOrderedYoutube?.displaySize, "small", "YouTube display size should survive raw text round trip");

const projectWithBlocks = buildBookProject({
  title: "順序検証",
  slug: "preview-round-trip",
  publicationStatus: "published",
  publicationVisibility: "public",
  subtitle: "",
  author: "Verifier",
  description: "",
  publisherName: "",
  publishedAt: "",
  copyrightText: "",
  rawText: rawTextFromBlocks,
  bindingDirection: "rtl",
  theme: "classic",
  charactersPerPage: 380,
  tableOfContentsItemsPerPage: 6,
  images: orderedImages,
  contentBlocks: orderedBlocks,
});
assert.equal(projectWithBlocks.ok, true, "Project with mixed content blocks should build");
if (projectWithBlocks.ok) {
  assert.equal(projectWithBlocks.project.config.slug, "preview-round-trip");
  assert.deepEqual(projectWithBlocks.project.config.publication, {
    status: "published",
    visibility: "public",
  });
  const parsed = parseBookProjectJson(JSON.stringify(projectWithBlocks.project));
  assert.ok(parsed, "Saved project JSON should parse");
  assert.ok(parsed?.contentBlocks, "Parsed project should retain content blocks");
  assert.deepEqual(
    blockSignature(parsed?.contentBlocks || []),
    blockSignature(orderedBlocks),
    "Project save/restore should keep block order",
  );
}

const previewResult = buildBookProject({
  title: "プレビュー順序",
  subtitle: "",
  author: "Verifier",
  description: "",
  publisherName: "",
  publishedAt: "",
  copyrightText: "",
  rawText: ["# 第一章", "", "先頭段落", "", "[[image:preview-image|挿絵]]", "", "後続段落"].join("\n"),
  bindingDirection: "rtl",
  theme: "classic",
  charactersPerPage: 2000,
  tableOfContentsItemsPerPage: 6,
  images: [
    {
      id: "preview-image",
      fileName: "preview.png",
      dataUrl: "data:image/png;base64,CCCC",
      mimeType: "image/png",
      size: 0,
      caption: "挿絵",
      insertChapter: "1",
      orderInChapter: 1,
    },
  ],
});
assert.equal(previewResult.ok, true, "Preview project should build");
if (previewResult.ok) {
  const previewPages = buildReaderPages({
    chapters: previewResult.project.chapters,
    images: previewResult.project.images,
    charactersPerPage: previewResult.project.config.charactersPerPage,
    tableOfContentsItemsPerPage: previewResult.project.config.tableOfContentsItemsPerPage,
  });
  const chapterTitleIndex = previewPages.findIndex((page) => page.kind === "chapterTitle");
  const firstTextIndex = previewPages.findIndex(
    (page) => page.kind === "text" && page.paragraphs.some((paragraph) => paragraph.includes("先頭段落")),
  );
  const imageIndex = previewPages.findIndex(
    (page) => page.kind === "image" && page.imageId === "preview-image",
  );
  const secondTextIndex = previewPages.findIndex(
    (page) => page.kind === "text" && page.paragraphs.some((paragraph) => paragraph.includes("後続段落")),
  );
  assert.ok(chapterTitleIndex >= 0, "Chapter title page should exist");
  assert.ok(firstTextIndex > chapterTitleIndex, "First text page should appear after chapter title");
  assert.ok(imageIndex > firstTextIndex, "Image page should appear after first text page");
  assert.ok(secondTextIndex > imageIndex, "Second text page should appear after image page");

  const legacyProject = { ...previewResult.project, contentBlocks: undefined };
  const normalizedLegacyProject = parseBookProjectJson(legacyProject);
  assert.ok(normalizedLegacyProject?.contentBlocks?.length, "Legacy Preview projects should recover content blocks");
}

assert.equal(resolveSafeInternalReturnPath("/dashboard/books/abc/edit"), "/dashboard/books/abc/edit");
assert.equal(resolveSafeInternalReturnPath("//evil.example/path"), "/dashboard");
assert.equal(resolveSafeInternalReturnPath("https://evil.example/path"), "/dashboard");
assert.equal(resolveSafeInternalReturnPath("reader"), "/dashboard");

const requiredBase = {
  title: "Title",
  authorName: "Author",
  description: "Description",
  authorHandle: "author",
  slug: "safe-book-01",
};
const requiredMissingTitle = validateRequiredBookFields({ ...requiredBase, title: "   " });
assert.equal(requiredMissingTitle.isValid, true);
assert.equal(requiredMissingTitle.globalError, "");
assert.equal(requiredMissingTitle.fieldErrors.title, undefined);
assert.equal(requiredMissingTitle.firstMissingField, undefined);

const requiredMissingAuthor = validateRequiredBookFields({ ...requiredBase, authorName: "  " });
assert.equal(requiredMissingAuthor.isValid, true);
assert.equal(requiredMissingAuthor.fieldErrors.author, undefined);

const requiredMissingDescription = validateRequiredBookFields({ ...requiredBase, description: "\t" });
assert.equal(requiredMissingDescription.isValid, true);
assert.equal(requiredMissingDescription.fieldErrors.description, undefined);

const requiredMissingAuthorHandle = validateRequiredBookFields({ ...requiredBase, authorHandle: "  " });
assert.equal(requiredMissingAuthorHandle.isValid, true);
assert.equal(requiredMissingAuthorHandle.fieldErrors.authorHandle, undefined);

const requiredMissingSlug = validateRequiredBookFields({ ...requiredBase, slug: "\n" });
assert.equal(requiredMissingSlug.isValid, false);
assert.equal(requiredMissingSlug.fieldErrors.slug, "公開URLを入力してください。");

const invalidHandle = validateRequiredBookFields({ ...requiredBase, authorHandle: "日本語" });
assert.equal(invalidHandle.isValid, true);
assert.equal(invalidHandle.globalError, "");
assert.equal(invalidHandle.fieldErrors.authorHandle, undefined);

const invalidShortHandle = validateRequiredBookFields({ ...requiredBase, authorHandle: "a" });
assert.equal(invalidShortHandle.isValid, true);
assert.equal(invalidShortHandle.fieldErrors.authorHandle, undefined);

const invalidSlug = validateRequiredBookFields({ ...requiredBase, slug: "my book" });
assert.equal(invalidSlug.isValid, false);
assert.equal(invalidSlug.fieldErrors.slug, "公開URLは半角英数字とハイフンで入力してください。");

const requiredBothPresent = validateRequiredBookFields(requiredBase);
assert.equal(requiredBothPresent.isValid, true);
assert.equal(requiredBothPresent.globalError, "");
assert.deepEqual(requiredBothPresent.fieldErrors, {});

const onlyPublicUrl = validateRequiredBookFields({
  title: "",
  authorName: "",
  description: "",
  authorHandle: "",
  slug: "only-public-url",
});
assert.equal(onlyPublicUrl.isValid, true, "A public URL is sufficient for the editor gate");
assert.deepEqual(onlyPublicUrl.fieldErrors, {});

const noteTemplate = buildShareTemplate({
  platform: "note",
  title: "  作品タイトル  ",
  description: "  作品の紹介文  ",
  url: "https://webbookmaker.vercel.app/books/sample-book",
});
assert.equal(
  noteTemplate,
  "【作品タイトル】\n\n作品の紹介文\n\nWebBookMakerで読む\nhttps://webbookmaker.vercel.app/books/sample-book\n\n#WebBookMaker",
  "Note share template should use the canonical plain-text format",
);
const noDescriptionTemplate = buildShareTemplate({
  platform: "facebook",
  title: "作品タイトル",
  description: "   ",
  url: "https://webbookmaker.vercel.app/books/sample-book",
});
assert.equal(noDescriptionTemplate.includes("undefined"), false);
assert.equal(noDescriptionTemplate.includes("作品の紹介文"), false);
assert.match(
  buildFacebookShareUrl({ title: "作品タイトル", description: "紹介", url: "https://example.com/books/a" }),
  /^https:\/\/www\.facebook\.com\/sharer\/sharer\.php\?u=/,
  "Facebook share URL should be encoded and include the public URL",
);
assert.equal(NOTE_NEW_POST_URL, "https://note.com/new", "Note should use the normal new-post destination");
const xTemplate = buildXShareTemplate({
  title: "test",
  description: "作品の紹介文",
  url: "https://example.com/books/sample-book",
  hashtags: ["WebBookMaker"],
});
assert.equal(xTemplate.includes("のWebブックを公開しました。"), false, "X share should not include the publication boilerplate");
assert.ok(xTemplate.includes("【test】"), "X share should retain the book title");
assert.ok(xTemplate.includes("作品の紹介文"), "X share should include the description");
assert.ok(xTemplate.includes("https://example.com/books/sample-book"), "X share should include the public URL");
assert.match(buildXShareUrl({ title: "test", description: "作品の紹介文", url: "https://example.com/books/sample-book" }), /^https:\/\/twitter\.com\/intent\/tweet\?text=/);
assert.match(
  xIntentUrl("作品タイトル\nhttps://example.com/books/a"),
  /^https:\/\/twitter\.com\/intent\/tweet\?text=/,
  "X share should resolve to the direct compose URL",
);
const lineTemplate = buildLineShareTemplate({
  title: "作品タイトル",
  description: "紹介",
  url: "https://example.com/books/a",
});
assert.equal(lineTemplate, "【作品タイトル】\n\n紹介\n\nWebBookMakerで読む\nhttps://example.com/books/a");
assert.ok(!lineTemplate.includes("#WebBookMaker"), "LINE template should not add the X/note hashtag");
const lineShareUrl = buildLineShareUrl({
  title: "作品タイトル",
  description: "紹介",
  url: "https://example.com/books/a",
});
assert.match(lineShareUrl, /^https:\/\/line\.me\/R\/share\?text=/, "LINE share URL should use the official share endpoint");
assert.ok(lineShareUrl.includes(encodeURIComponent(lineTemplate)), "LINE share URL should encode the complete template");
const lineWebShareUrl = buildLineWebShareUrl({
  title: "作品タイトル",
  description: "紹介",
  url: "https://example.com/books/a",
});
assert.match(lineWebShareUrl, /^https:\/\/social-plugins\.line\.me\/lineit\/share\?url=/, "Desktop LINE share should use the LINE web share endpoint");
assert.ok(lineWebShareUrl.includes(encodeURIComponent(lineTemplate)), "Desktop LINE share should preserve the complete template");

const readerShareInput = {
  title: "星降る街の小さな記録",
  description: "孤独な少女と、星をめぐる小さな奇跡の物語。",
  url: "https://webbookmaker.vercel.app/books/star-town-records",
};
const readerTemplate = buildReaderShareTemplate(readerShareInput);
assert.ok(readerTemplate.startsWith("おすすめのWebブック"), "Reader shares should use reader-facing copy");
assert.ok(readerTemplate.includes(readerShareInput.title), "Reader share should include the current title");
assert.ok(readerTemplate.includes(readerShareInput.url), "Reader share should include the public URL");
assert.equal(readerTemplate.includes("undefined"), false, "Reader share should never contain undefined");
assert.equal(readerTemplate.includes("[object Object]"), false, "Reader share should never contain object text");
assert.notEqual(readerTemplate, noteTemplate, "Reader and author share templates should remain separate");
assert.match(buildReaderXShareUrl(readerShareInput), /^https:\/\/twitter\.com\/intent\/tweet\?text=/);
assert.match(buildReaderFacebookShareUrl(readerShareInput), /^https:\/\/www\.facebook\.com\/sharer\/sharer\.php\?u=/);
assert.ok(buildReaderFacebookShareUrl(readerShareInput).includes(encodeURIComponent(readerShareInput.url)));
assert.match(buildReaderLineShareUrl(readerShareInput), /^https:\/\/line\.me\/R\/share\?text=/);
assert.ok(buildReaderLineShareUrl(readerShareInput).includes(encodeURIComponent(readerTemplate)));
assert.match(buildReaderLineWebShareUrl(readerShareInput), /^https:\/\/social-plugins\.line\.me\/lineit\/share\?/);
assert.equal(READER_NOTE_NEW_POST_URL, NOTE_NEW_POST_URL);

// The editor uses the public URL as the only save/publish gate; descriptive
// fields may be omitted without blocking canonical commands.
assert.equal(requiredMissingTitle.isValid, true);
assert.equal(requiredBothPresent.isValid, true);

const desktopPopover = computeInlineImagePopoverLayout({
  anchorRect: { top: 860, left: 1320, right: 1368, bottom: 908, width: 48, height: 48 },
  popoverRect: { top: 0, left: 0, right: 300, bottom: 180, width: 300, height: 180 },
  viewport: { width: 1440, height: 1024 },
});
assert.ok(desktopPopover.left >= 12, "Desktop popover should stay inside left padding");
assert.ok(desktopPopover.top >= 12, "Desktop popover should stay inside top padding");
assert.ok(desktopPopover.left + 300 <= 1440 - 12, "Desktop popover should stay inside right padding");
assert.ok(desktopPopover.top + 180 <= 1024 - 88 - 12, "Desktop popover should stay above bottom action area");

const mobilePopover = computeInlineImagePopoverLayout({
  anchorRect: { top: 720, left: 10, right: 52, bottom: 762, width: 42, height: 42 },
  popoverRect: { top: 0, left: 0, right: 280, bottom: 170, width: 280, height: 170 },
  viewport: { width: 390, height: 844 },
});
assert.ok((mobilePopover.width || 0) <= 390 - 24, "Mobile popover width should fit viewport");
assert.ok(mobilePopover.left >= 12, "Mobile popover should stay inside left padding");
assert.ok(mobilePopover.top >= 12, "Mobile popover should stay inside top padding");
assert.ok(mobilePopover.top + 170 <= 844 - 88 - 12, "Mobile popover should stay above bottom action area");

const legacyCoverDesign = normalizeCoverDesign(undefined);
assert.deepEqual(legacyCoverDesign, DEFAULT_COVER_DESIGN, "Legacy covers should use the standard layout");
const boundedCoverDesign = normalizeCoverDesign({ layout: "layout-10", titleScale: 9, authorScale: 9, overlayOpacity: -1 });
assert.equal(boundedCoverDesign.layout, "layout-10");
assert.equal(boundedCoverDesign.titleScale, COVER_TITLE_IMAGE_SCALE_MAX);
assert.equal(boundedCoverDesign.imageScale, COVER_TITLE_IMAGE_SCALE_MAX);
assert.equal(boundedCoverDesign.authorScale, COVER_AUTHOR_SCALE_MAX);
assert.equal(normalizeCoverDesign({ titleScale: 0, imageScale: 0 }).titleScale, COVER_TITLE_IMAGE_SCALE_MIN);
assert.equal(normalizeCoverDesign({ titleScale: 0, imageScale: 0 }).imageScale, COVER_TITLE_IMAGE_SCALE_MIN);
assert.equal(normalizeCoverDesign(undefined).titleVisible, true);
assert.equal(normalizeCoverDesign(undefined).authorVisible, true);
assert.equal(normalizeCoverDesign({ titleVisible: false, authorVisible: false }).titleVisible, false);
assert.equal(normalizeCoverDesign({ titleVisible: false, authorVisible: false }).authorVisible, false);
assert.equal(boundedCoverDesign.overlayOpacity, 0);
assert.equal(normalizeCoverTitleOverride("星降る街の\n小さな記録"), "星降る街の\n小さな記録");
assert.equal(normalizeCoverTitleOverride("星降る街の  \n　小さな記録 "), "星降る街の  \n　小さな記録 ");
assert.equal(normalizeCoverTitleOverride("星\n\n\n降る\n街\n記録"), "星\n\n降る");
assert.equal(normalizeCoverTitleOverride(""), "");
assert.equal(normalizeCoverTitleOverride("  　"), "  　");

const adjusted = upsertPageAdjustment([], "chapter-1-text-1", {
  pageBreakAfter: true,
  paragraphSpacing: "wide",
  displayTextOverride: "本文の\n改行",
});
assert.equal(adjusted[0]?.blockId, "chapter-1-text-1");
assert.equal(adjusted[0]?.pageBreakAfter, true);
assert.equal(normalizePageAdjustments(adjusted)[0]?.paragraphSpacing, "wide");
assert.equal(normalizePageAdjustments(adjusted)[0]?.displayTextOverride, "本文の\n改行");
assert.deepEqual(removePageAdjustment(adjusted, "chapter-1-text-1"), []);

const baseEditorState: EditorDraftState = {
  title: "",
  subtitle: "",
  author: "",
  description: "",
  publisherName: "WebBookMaker",
  publishedAt: "",
  copyrightText: "",
  rawText: "",
  bindingDirection: "rtl",
  theme: "classic",
  language: "ja",
  fontFamily: "mincho",
  fontScale: "medium",
  lineHeight: "normal",
  marginScale: "standard",
  pageWidth: "standard",
  background: "paper",
  textColor: "#2f251d",
  accentColor: "#6bb9ad",
  coverStyle: "overlay",
  imageLayout: "framed",
  charactersPerPage: 380,
  tableOfContentsItemsPerPage: 6,
  visibility: "private",
  status: "draft",
  slug: "canonical-test-book",
  authorHandle: "",
  authorBio: "",
  authorWebsiteUrl: "",
  authorXUrl: "",
  authorNoteUrl: "",
  externalLinkLabel: "",
  externalLinkUrl: "",
  externalSalesUrl: "",
  externalSalesLabel: "",
};

const canonicalCoverResult = buildCanonicalBookPayload({
  state: {
    ...baseEditorState,
    title: "正式タイトル",
    author: "作者",
    description: "説明",
    coverDesign: {
      ...DEFAULT_COVER_DESIGN,
      titleTextOverride: "正式\n表紙タイトル",
      titleVisible: false,
      authorVisible: false,
    },
  },
  contentBlocks: [{ id: "text-001", type: "text", content: "本文" }],
  images: [],
});
assert.equal(canonicalCoverResult.ok, true, "Canonical payload should accept cover title override");
if (canonicalCoverResult.ok) {
  assert.equal(canonicalCoverResult.payload.title, "正式タイトル");
  assert.equal(canonicalCoverResult.payload.coverDesign.titleTextOverride, "正式\n表紙タイトル");
  assert.equal(canonicalCoverResult.payload.coverDesign.titleVisible, false);
  assert.equal(canonicalCoverResult.payload.coverDesign.authorVisible, false);
  assert.equal(
    canonicalPayloadToBookProjectInput(canonicalCoverResult.payload).coverDesign?.titleTextOverride,
    "正式\n表紙タイトル",
  );
  assert.equal(
    canonicalPayloadToBookProjectInput(canonicalCoverResult.payload).coverDesign?.titleVisible,
    false,
  );
  assert.equal(
    canonicalPayloadToBookProjectInput(canonicalCoverResult.payload).coverDesign?.authorVisible,
    false,
  );
}

const youtubeCanonicalResult = buildCanonicalBookPayload({
  state: {
    ...baseEditorState,
    title: "YouTube canonical test",
    author: "Verifier",
    description: "YouTube block round trip",
  },
  contentBlocks: [
    { id: "text-youtube", type: "text", content: "Before" },
    {
      id: "youtube-canonical",
      type: "youtube",
      videoId: "dQw4w9WgXcQ",
      originalUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      displayMode: "inline",
      displaySize: "large",
    },
  ],
  images: [],
});
assert.equal(youtubeCanonicalResult.ok, true, "Canonical payload should accept a YouTube block");
if (youtubeCanonicalResult.ok) {
  const canonicalYoutube = youtubeCanonicalResult.payload.contentBlocks.find((block) => block.type === "youtube");
  assert.equal(canonicalYoutube?.videoId, "dQw4w9WgXcQ");
  assert.equal(canonicalYoutube?.displayMode, "inline");
  assert.equal(canonicalYoutube?.displaySize, "large");
  const restoredYoutube = canonicalPayloadToBookProjectInput(youtubeCanonicalResult.payload).contentBlocks?.find(
    (block) => block.type === "youtube",
  );
  assert.equal(restoredYoutube?.id, "youtube-canonical", "Canonical round trip should preserve the YouTube block ID");
  assert.equal(restoredYoutube?.displayMode, "inline", "Canonical round trip should preserve YouTube display mode");
  assert.equal(restoredYoutube?.displaySize, "large", "Canonical round trip should preserve YouTube display size");
}

const paywallCanonicalResult = buildCanonicalBookPayload({
  state: {
    ...baseEditorState,
    title: "Paywall canonical test",
    author: "Verifier",
    description: "Paywall block round trip",
  },
  contentBlocks: [
    { id: "paywall-free", type: "text", content: "無料本文" },
    { id: "paywall-boundary", type: "paywall" },
    { id: "paywall-paid", type: "text", content: "有料本文" },
  ],
  images: [],
});
assert.equal(paywallCanonicalResult.ok, true, "Canonical payload should accept a Paywall block");
if (paywallCanonicalResult.ok) {
  assert.deepEqual(
    paywallCanonicalResult.payload.contentBlocks.map((block) => block.type),
    ["text", "paywall", "text"],
    "Canonical payload must preserve the Paywall block position",
  );
  const restoredPaywallBlocks = canonicalPayloadToBookProjectInput(paywallCanonicalResult.payload).contentBlocks || [];
  assert.deepEqual(
    restoredPaywallBlocks.map((block) => block.type),
    ["text", "paywall", "text"],
    "Canonical round trip must restore the Paywall block",
  );
  assert.equal(restoredPaywallBlocks[1]?.id, "paywall-boundary");
  const persistedPaywall = paywallCanonicalResult.payload.contentBlocks[1];
  assert.equal(persistedPaywall?.type, "paywall");
  if (persistedPaywall?.type === "paywall") {
    assert.equal(persistedPaywall.previousBlockId, "paywall-free", "Canonical Paywall must persist its previous anchor");
    assert.equal(persistedPaywall.nextBlockId, "paywall-paid", "Canonical Paywall must persist its next anchor");
  }
  const previewProject = buildBookProject(canonicalPayloadToBookProjectInput(paywallCanonicalResult.payload));
  assert.equal(previewProject.ok, true, "Paywall project should build for Preview");
  if (previewProject.ok) {
    const previewPages = buildReaderPages({
      chapters: previewProject.project.chapters,
      images: previewProject.project.images,
      contentBlocks: previewProject.project.contentBlocks,
      charactersPerPage: 380,
      tableOfContentsItemsPerPage: 6,
      showPaywallPage: true,
    });
    const previewPaywallIndex = previewPages.findIndex((page) => page.kind === "paywall");
    assert.ok(previewPaywallIndex >= 0, "Author Preview must show the Paywall boundary");
    assert.equal(previewPages.at(-1)?.kind, "backCover", "Author Preview must keep later content and the back cover");

    // Persisted BookProject JSON, Preview storage, Smart Format, and the
    // autosave snapshot all use the canonical contentBlocks array as their
    // source of truth. Each round trip must retain the same ID and position.
    const reloadedProject = parseBookProjectJson(JSON.parse(JSON.stringify(previewProject.project)));
    assert.ok(reloadedProject, "Saved BookProject JSON should reload");
    assert.deepEqual(
      reloadedProject?.contentBlocks?.map((block) => block.type),
      ["text", "paywall", "text"],
      "Save/Reload must preserve the Paywall block",
    );
    assert.equal(reloadedProject?.contentBlocks?.[1]?.id, "paywall-boundary");

    const formatted = smartFormatContentBlocks(reloadedProject?.contentBlocks || []);
    assert.deepEqual(
      formatted.blocks.map((block) => block.type),
      ["text", "paywall", "text"],
      "Smart Format must preserve the Paywall block",
    );
    const autosaveFields = buildEditorDraftFields({
      mode: "edit",
      state: baseEditorState,
      images: [],
      contentBlocks: formatted.blocks,
      draftId: "paywall-draft",
    });
    const restoredDraft = seedFromDraftFields({ mode: "edit", initialState: baseEditorState, fields: autosaveFields });
    assert.deepEqual(
      restoredDraft.contentBlocks.map((block) => block.type),
      ["text", "paywall", "text"],
      "Autosave restore must preserve the Paywall block",
    );
    assert.equal(restoredDraft.contentBlocks[1]?.id, "paywall-boundary");
  }
}

// Production reproduction: legacy Smart Format content may have Markdown H1
// chapter blocks without structureRole, and an empty paragraph may sit next
// to the Paywall. The Reader must still resolve the #03 chapter anchor rather
// than falling back to the first chapter.
const productionPaywallBlocks: BookContentBlock[] = [
  { id: "prod-before", type: "text", content: "無料本文" },
  { id: "prod-empty", type: "text", content: "" },
  { id: "prod-paywall", type: "paywall" },
  { id: "prod-chapter-03", type: "text", content: "# 03｜最初の1週間で、機能を半分捨てた" },
  { id: "prod-after", type: "text", content: "有料本文" },
];
const productionCanonical = buildCanonicalBookPayload({
  state: { ...baseEditorState, title: "Production Paywall reproduction", author: "Verifier" },
  contentBlocks: productionPaywallBlocks,
  images: [],
});
assert.equal(productionCanonical.ok, true, "Editor Save canonical payload should build for the production reproduction");
const productionCanonicalBlocks = productionCanonical.ok
  ? canonicalPayloadToBookProjectInput(productionCanonical.payload).contentBlocks || []
  : [];
assert.equal(productionCanonicalBlocks.find((block) => block.type === "paywall")?.nextBlockId, "prod-chapter-03", "Canonical Save/Reload must retain the #03 next anchor");
const productionProject = buildBookProject({
  title: "Production Paywall reproduction",
  slug: "production-paywall-reproduction",
  subtitle: "",
  author: "Verifier",
  description: "",
  publisherName: "",
  publishedAt: "",
  copyrightText: "",
  rawText: "",
  bindingDirection: "rtl",
  theme: "classic",
  charactersPerPage: 380,
  tableOfContentsItemsPerPage: 6,
  images: [],
  contentBlocks: productionPaywallBlocks,
});
assert.equal(productionProject.ok, true, "Production Paywall reproduction project should build");
if (productionProject.ok) {
  const persisted = productionProject.project.contentBlocks?.find((block) => block.type === "paywall");
  assert.equal(persisted?.type, "paywall");
  if (persisted?.type === "paywall") {
    assert.equal(persisted.previousBlockId, "prod-before", "Empty paragraphs must not become the previous Paywall anchor");
    assert.equal(persisted.nextBlockId, "prod-chapter-03", "Paywall next anchor must resolve to #03");
    assert.equal(persisted.chapterId, "prod-chapter-03", "Paywall chapter anchor must point to the target chapter when inserted before its heading");
  }
  const reloaded = parseBookProjectJson(JSON.stringify(productionProject.project));
  assert.equal(reloaded?.contentBlocks?.find((block) => block.type === "paywall")?.nextBlockId, "prod-chapter-03", "Reload must preserve the Paywall anchor");
  const pages = buildReaderPages({
    chapters: productionProject.project.chapters,
    images: productionProject.project.images,
    contentBlocks: productionProject.project.contentBlocks,
    charactersPerPage: 380,
    tableOfContentsItemsPerPage: 6,
    showPaywallPage: true,
  });
  const paywallPageIndex = pages.findIndex((page) => page.kind === "paywall");
  const chapter03Index = pages.findIndex((page) => page.kind === "chapterTitle" && page.chapterTitle?.includes("03｜"));
  assert.equal(paywallPageIndex + 1, chapter03Index, "Production reproduction must place Paywall immediately before #03");
}

function assertPaywallNeighborPages(label: string, blocks: BookContentBlock[], images: ImageManifestRow[] = []) {
  const paywallIndex = blocks.findIndex((block) => block.type === "paywall");
  assert.ok(paywallIndex > 0 && paywallIndex < blocks.length - 1, `${label}: fixture needs two Paywall neighbours`);
  const previousBlockId = blocks[paywallIndex - 1]?.id;
  const nextBlockId = blocks[paywallIndex + 1]?.id;
  const rawText = contentBlocksToRawText(blocks);
  const chapters = extractChaptersFromText(rawText, `${label} title`, blocks);
  const pages = buildReaderPages({
    chapters,
    images,
    contentBlocks: blocks,
    charactersPerPage: 80,
    tableOfContentsItemsPerPage: 6,
    showPaywallPage: true,
  });
  const paywallPageIndex = pages.findIndex((page) => page.kind === "paywall");
  assert.ok(paywallPageIndex >= 0, `${label}: Preview must render the Paywall page`);
  const previousPageIndex = Math.max(
    ...pages
      .map((page, index) => (index < paywallPageIndex && page.sourceBlockIds?.includes(previousBlockId || "") ? index : -1)),
  );
  const nextPageIndex = pages.findIndex(
    (page, index) => index > paywallPageIndex && page.sourceBlockIds?.includes(nextBlockId || ""),
  );
  assert.ok(previousPageIndex >= 0, `${label}: previous block must remain before Paywall`);
  assert.ok(nextPageIndex > paywallPageIndex, `${label}: next block must remain after Paywall`);
  return { pages, paywallPageIndex, previousPageIndex, nextPageIndex, previousBlockId, nextBlockId };
}

const chapterMidBlocks: BookContentBlock[] = [
  { id: "a-heading", type: "text", content: "第一章", structureRole: "chapter" },
  { id: "a-text", type: "text", content: "本文A" },
  { id: "b-text", type: "text", content: "本文B" },
  { id: "a-paywall", type: "paywall" },
  { id: "c-text", type: "text", content: "本文C" },
];
const chapterMidPlacement = assertPaywallNeighborPages("chapter midpoint", chapterMidBlocks);
assert.equal(chapterMidPlacement.previousBlockId, "b-text");
assert.equal(chapterMidPlacement.nextBlockId, "c-text");

const h2Blocks: BookContentBlock[] = [
  { id: "b-heading", type: "text", content: "第一章", structureRole: "chapter" },
  { id: "h2-heading", type: "text", content: "## 小見出し", structureRole: "subheading" },
  { id: "h2-text", type: "text", content: "小見出し本文" },
  { id: "h2-paywall", type: "paywall" },
  { id: "h2-next", type: "text", content: "小見出し後の本文" },
];
assertPaywallNeighborPages("H2 boundary", h2Blocks);

const imageBlocks: BookContentBlock[] = [
  { id: "c-heading", type: "text", content: "第一章", structureRole: "chapter" },
  {
    id: "c-image",
    type: "image",
    storagePath: "storage:book-assets/c-image.webp",
    fileName: "c-image.webp",
    mimeType: "image/webp",
    width: 1200,
    height: 800,
    fitMode: "contain",
    pageMode: "full-page",
  },
  { id: "c-paywall", type: "paywall" },
  { id: "c-next", type: "text", content: "画像後の本文" },
];
assertPaywallNeighborPages("image boundary", imageBlocks, [{
  chapter_order: 1,
  chapter_title: "第一章",
  image_index: "c-image",
  image_id: "c-image",
  image_url: "storage:book-assets/c-image.webp",
  storage_path: "storage:book-assets/c-image.webp",
  alt: "画像",
  caption: "",
  source_path: "c-image.webp",
  local_path: "",
}]);

const chapterBoundaryBlocks: BookContentBlock[] = [
  { id: "d-heading", type: "text", content: "第一章", structureRole: "chapter" },
  { id: "d-text", type: "text", content: "旧章の本文" },
  { id: "d-paywall", type: "paywall" },
  { id: "e-heading", type: "text", content: "第二章", structureRole: "chapter" },
  { id: "e-text", type: "text", content: "次章の本文" },
];
assertPaywallNeighborPages("chapter boundary before H1", chapterBoundaryBlocks);

const afterChapterHeadingBlocks: BookContentBlock[] = [
  { id: "f-heading", type: "text", content: "第一章", structureRole: "chapter" },
  { id: "g-heading", type: "text", content: "第二章", structureRole: "chapter" },
  { id: "g-paywall", type: "paywall" },
  { id: "g-text", type: "text", content: "第二章の本文" },
];
assertPaywallNeighborPages("chapter boundary after H1", afterChapterHeadingBlocks);

const smartPaywall = smartFormatContentBlocks(chapterMidBlocks).blocks;
const smartPaywallIndex = smartPaywall.findIndex((block) => block.type === "paywall");
assert.equal(smartPaywall[smartPaywallIndex - 1]?.id, "b-text", "Smart Format must retain the Paywall previous block");
assert.equal(smartPaywall[smartPaywallIndex + 1]?.id, "c-text", "Smart Format must retain the Paywall next block");

const emptyCoverResult = buildCanonicalBookPayload({
  state: {
    ...baseEditorState,
    title: "正式タイトル",
    author: "作者",
    description: "説明",
    coverDesign: {
      ...DEFAULT_COVER_DESIGN,
      titleTextOverride: "",
    },
  },
  contentBlocks: [{ id: "text-002", type: "text", content: "本文" }],
  images: [],
});
assert.equal(emptyCoverResult.ok, true, "Canonical payload should accept an intentional empty cover title");
if (emptyCoverResult.ok) {
  assert.equal(emptyCoverResult.payload.title, "正式タイトル");
  assert.equal(emptyCoverResult.payload.coverDesign.titleTextOverride, "");
  assert.equal(
    canonicalPayloadToBookProjectInput(emptyCoverResult.payload).coverDesign?.titleTextOverride,
    "",
  );
}

const optionalMetadataCanonicalResult = buildCanonicalBookPayload({
  state: {
    ...baseEditorState,
    title: "",
    author: "",
    description: "",
    authorHandle: "",
    slug: "only-public-url",
  },
  contentBlocks: [],
  images: [],
});
assert.equal(optionalMetadataCanonicalResult.ok, true, "Canonical save should require only a public URL");

const draftBlocks: BookContentBlock[] = [
  {
    id: "youtube-draft",
    type: "youtube",
    videoId: "dQw4w9WgXcQ",
    originalUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    displayMode: "inline",
    displaySize: "small",
  },
  { id: "text-001", type: "text", content: "長文テキスト" },
  {
    id: "img-001",
    type: "image",
    storagePath: "https://cdn.example.com/image.webp",
    fileName: "image.webp",
    mimeType: "image/webp",
    width: 1200,
    height: 800,
    caption: "挿絵",
    altText: "alt",
    fitMode: "contain",
    pageMode: "full-page",
    displaySize: "large",
    uploadState: "ready",
  },
];
const draftImages = uploadedImagesFromBlocks(draftBlocks);
const draftFields = buildEditorDraftFields({
  mode: "new",
  draftId: "draft-1",
  state: {
    ...baseEditorState,
    title: "タイトル",
    author: "作者",
    rawText: "長文テキスト\n[[image:img-001|挿絵]]",
    coverImage: "https://cdn.example.com/cover.webp",
    theme: "photo",
    fontFamily: "serif",
  },
  contentBlocks: draftBlocks,
  images: draftImages,
});
const restoredSeed = seedFromDraftFields({
  mode: "new",
  initialState: baseEditorState,
  fields: draftFields,
});
assert.equal(restoredSeed.restored, true, "Draft seed should be restored when draft fields exist");
assert.equal(restoredSeed.state.title, "タイトル");
assert.equal(restoredSeed.state.author, "作者");
assert.equal(restoredSeed.state.theme, "photo");
assert.equal(restoredSeed.state.fontFamily, "serif");
assert.equal(restoredSeed.state.coverImage, "https://cdn.example.com/cover.webp");
assert.equal(restoredSeed.contentBlocks.some((block) => block.type === "image"), true);
assert.equal(restoredSeed.contentBlocks.some((block) => block.type === "youtube"), true);
const restoredDraftYoutube = restoredSeed.contentBlocks.find((block) => block.type === "youtube");
const restoredDraftImage = restoredSeed.contentBlocks.find((block) => block.type === "image");
assert.equal(restoredDraftYoutube?.displayMode, "inline", "Draft restore should preserve YouTube display mode");
assert.equal(restoredDraftYoutube?.displaySize, "small", "Draft restore should preserve YouTube display size");
assert.equal(restoredDraftImage?.displaySize, "large", "Draft restore should preserve image display size");

// Autosave snapshots are isolated by both user and book, tolerate malformed
// storage, expire old data, and never persist transient image references.
const autosaveStorage = new Map<string, string>();
const fakeLocalStorage = {
  getItem: (key: string) => autosaveStorage.get(key) ?? null,
  setItem: (key: string, value: string) => {
    autosaveStorage.set(key, value);
  },
  removeItem: (key: string) => {
    autosaveStorage.delete(key);
  },
} as unknown as Storage;
const globalWithWindow = globalThis as unknown as {
  window?: { localStorage: Storage };
};
const previousWindow = globalWithWindow.window;
globalWithWindow.window = { localStorage: fakeLocalStorage };
try {
  // A newer manual save must win over a stale autosave snapshot. This is the
  // deterministic persistence check for the editor's save/autosave race:
  // whichever snapshot is written last is the one restored, including the
  // Paywall block and its stable ID.
  const stalePaywallFields = buildEditorDraftFields({
    mode: "edit",
    draftId: "book-1",
    state: baseEditorState,
    images: [],
    contentBlocks: [{ id: "text-stale", type: "text", content: "無料本文" }],
  });
  const latestPaywallFields = buildEditorDraftFields({
    mode: "edit",
    draftId: "book-1",
    state: baseEditorState,
    images: [],
    contentBlocks: [
      { id: "text-latest", type: "text", content: "無料本文" },
      { id: "paywall-race", type: "paywall" },
      { id: "text-paid", type: "text", content: "有料本文" },
    ],
  });
  assert.ok(saveAutosaveDraft({ bookId: "book-1", userId: "user-1", fields: stalePaywallFields }));
  assert.ok(saveAutosaveDraft({ bookId: "book-1", userId: "user-1", fields: latestPaywallFields }));
  const latestRestoredFields = loadAutosaveDraft("book-1", "user-1")?.fields;
  assert.deepEqual(
    (latestRestoredFields?.contentBlocks as BookContentBlock[]).map((block) => block.type),
    ["text", "paywall", "text"],
    "Latest autosave/manual snapshot must retain the Paywall block",
  );
  assert.equal(
    (latestRestoredFields?.contentBlocks as BookContentBlock[])[1]?.id,
    "paywall-race",
    "Latest autosave/manual snapshot must retain the Paywall ID",
  );

  const autosaveFields = buildEditorDraftFields({
    mode: "edit",
    draftId: "book-1",
    state: {
      ...baseEditorState,
      title: "自動保存タイトル",
      rawText: "本文",
      coverImage: "data:image/png;base64,transient",
      coverImageStoragePath: "storage:book-assets/books/cover.png",
    },
    images: [
      {
        id: "pending-image",
        fileName: "pending.png",
        dataUrl: "blob:https://example.test/pending",
        mimeType: "image/png",
        size: 12,
        caption: "",
        insertChapter: "1",
        orderInChapter: 1,
      },
    ],
    contentBlocks: [
      { id: "text-001", type: "text", content: "本文" },
      {
        id: "pending-image",
        type: "image",
        storagePath: "blob:https://example.test/pending",
        fileName: "pending.png",
        mimeType: "image/png",
        width: 100,
        height: 100,
        fitMode: "contain",
        pageMode: "inline",
      },
    ],
  });
  assert.equal(autosaveFields.coverImage, undefined);
  assert.equal(autosaveFields.coverImageStoragePath, "storage:book-assets/books/cover.png");
  assert.equal((autosaveFields.images as unknown[]).length, 0);
  assert.equal((autosaveFields.contentBlocks as BookContentBlock[]).length, 1);

  const savedAutosave = saveAutosaveDraft({ bookId: "book-1", userId: "user-1", fields: autosaveFields });
  assert.ok(savedAutosave, "Autosave should be serializable");
  assert.equal(loadAutosaveDraft("book-1", "user-1")?.fields.title, "自動保存タイトル");
  assert.equal(loadAutosaveDraft("book-1", "other-user"), null, "User data must not cross restore boundaries");
  assert.equal(autosaveStorage.has("webbookmaker:autosave:book-1"), true, "Other users' snapshots remain stored");
  assert.equal(loadAutosaveDraft("book-2", "user-1"), null, "Book data must not cross restore boundaries");

  fakeLocalStorage.setItem("webbookmaker:autosave:book-1", "{malformed");
  assert.equal(loadAutosaveDraft("book-1", "user-1"), null, "Malformed JSON must be discarded safely");

  const expired = saveAutosaveDraft({ bookId: "book-1", userId: "user-1", fields: autosaveFields });
  assert.ok(expired);
  fakeLocalStorage.setItem(
    "webbookmaker:autosave:book-1",
    JSON.stringify({ ...expired, fields: null }),
  );
  assert.equal(loadAutosaveDraft("book-1", "user-1"), null, "Malformed fields must be discarded safely");
  saveAutosaveDraft({ bookId: "book-1", userId: "user-1", fields: autosaveFields });
  fakeLocalStorage.setItem(
    "webbookmaker:autosave:book-1",
    JSON.stringify({ ...expired, savedAt: new Date(Date.now() - AUTOSAVE_MAX_AGE_MS - 1).toISOString() }),
  );
  assert.equal(loadAutosaveDraft("book-1", "user-1"), null, "Expired autosave must be discarded safely");
  const finalAutosave = saveAutosaveDraft({ bookId: "book-1", userId: "user-1", fields: autosaveFields });
  assert.ok(finalAutosave);
  deleteAutosaveDraft("book-1");
  assert.equal(loadAutosaveDraft("book-1", "user-1"), null, "Formal save cleanup should remove the autosave key");

  const savedHomeDraft = saveHomeDraft("ホーム入力の復元テスト", "cta");
  assert.ok(savedHomeDraft, "Home draft should be serializable");
  assert.equal(savedHomeDraft?.target, "cta");
  assert.equal(loadHomeDraft()?.text, "ホーム入力の復元テスト");
  assert.equal(loadHomeDraft()?.target, "cta");
  assert.equal(autosaveStorage.has(HOME_DRAFT_STORAGE_KEY), true, "Home draft must use its dedicated storage key");

  assert.equal(saveHomeDraft("   "), null, "Empty home drafts should be removed");
  assert.equal(loadHomeDraft(), null, "Empty home drafts should not be restored");

  fakeLocalStorage.setItem(HOME_DRAFT_STORAGE_KEY, JSON.stringify({ version: 999, text: "old", savedAt: Date.now() }));
  assert.equal(loadHomeDraft(), null, "Unknown home draft versions must be discarded safely");

  const throwingStorage = {
    getItem: () => {
      throw new Error("storage unavailable");
    },
    setItem: () => {
      throw new Error("storage unavailable");
    },
    removeItem: () => {
      throw new Error("storage unavailable");
    },
  } as unknown as Storage;
  globalWithWindow.window = { localStorage: throwingStorage };
  assert.equal(saveHomeDraft("Storage errors must not crash the home"), null);
  assert.equal(loadHomeDraft(), null);
  deleteHomeDraft();
  globalWithWindow.window = { localStorage: fakeLocalStorage };
} finally {
  if (previousWindow) {
    globalWithWindow.window = previousWindow;
  } else {
    delete globalWithWindow.window;
  }
}

const globalsCss = fs.readFileSync(path.join(process.cwd(), "src", "app", "globals.css"), "utf8");
const bookReaderSource = fs.readFileSync(path.join(process.cwd(), "src", "components", "BookReader.tsx"), "utf8");
const inlineEditorSource = fs.readFileSync(path.join(process.cwd(), "src", "components", "InlineManuscriptEditor.tsx"), "utf8");
const dashboardEditorSource = fs.readFileSync(path.join(process.cwd(), "src", "components", "DashboardBookEditor.tsx"), "utf8");
const termsPage = fs.readFileSync(path.join(process.cwd(), "src", "app", "terms", "page.tsx"), "utf8");
const privacyPage = fs.readFileSync(path.join(process.cwd(), "src", "app", "privacy", "page.tsx"), "utf8");
const commercePage = fs.readFileSync(path.join(process.cwd(), "src", "app", "commerce", "page.tsx"), "utf8");
const legalShell = fs.readFileSync(path.join(process.cwd(), "src", "components", "legal", "LegalPageShell.tsx"), "utf8");
const commercialTransactionsPage = fs.readFileSync(
  path.join(process.cwd(), "src", "app", "commercial-transactions", "page.tsx"),
  "utf8",
);
const signupForm = fs.readFileSync(path.join(process.cwd(), "src", "components", "AuthForm.tsx"), "utf8");
const ver2Footer = fs.readFileSync(path.join(process.cwd(), "src", "components", "ver2", "lp", "Ver2Footer.tsx"), "utf8");
const landingFooter = fs.readFileSync(path.join(process.cwd(), "src", "components", "ver2", "LandingFooter.tsx"), "utf8");
assert.match(termsPage, /title="利用規約"/);
assert.match(termsPage, /第25条（準拠法）/);
assert.match(legalShell, /制定日：2026年8月7日/);
assert.doesNotMatch(termsPage, /ベータ版ドラフト/);
assert.match(privacyPage, /title="プライバシーポリシー"/);
assert.match(privacyPage, /取得する情報/);
assert.match(privacyPage, /お問い合わせフォーム/);
assert.doesNotMatch(privacyPage, /support@webbookmaker\.app/);
assert.doesNotMatch(privacyPage, /ベータ版ドラフト/);
assert.match(commercePage, /特定商取引法に基づく表記/);
assert.match(commercePage, /legal-title-commercial/);
assert.match(commercePage, /¥980/);
assert.match(commercePage, /請求があった場合/);
assert.doesNotMatch(commercePage, /現在、決済を伴う有料機能は提供していません/);
assert.match(commercialTransactionsPage, /@\/app\/commerce\/page/);
assert.match(signupForm, /会員登録を行うことで/);
assert.match(signupForm, /href="\/terms"/);
assert.match(signupForm, /href="\/privacy"/);
assert.match(ver2Footer, /href="\/commercial-transactions"/);
assert.match(ver2Footer, /プライバシーポリシー/);
assert.match(landingFooter, /href="\/commercial-transactions"/);
assert.match(landingFooter, /href="\/contact"/);
assert.doesNotMatch(landingFooter, /support@webbookmaker\.app/);
const guidelinesPage = fs.readFileSync(path.join(process.cwd(), "src", "app", "guidelines", "page.tsx"), "utf8");
assert.match(guidelinesPage, /<h1>投稿ガイドライン<\/h1>/);
assert.doesNotMatch(guidelinesPage, /投稿ガイドライン（ベータ版）/);
for (const pageName of ["terms", "privacy", "commerce", "guidelines", "refund", "contact"]) {
  const pagePath = pageName === "commerce" ? "src/app/commerce/page.tsx" : `src/app/${pageName}/page.tsx`;
  const pageSource = fs.readFileSync(path.join(process.cwd(), pagePath), "utf8");
  if (["terms", "privacy", "commerce"].includes(pageName)) {
    assert.match(legalShell, /legal-bottom-home-link/, `${pageName} should use the shared bottom home link`);
  } else {
    assert.match(pageSource, /legal-bottom-home-link/, `${pageName} should have a bottom home link`);
  }
}
const footerCss = fs.readFileSync(
  path.join(process.cwd(), "src", "components", "ver2", "lp", "Ver2Landing.module.css"),
  "utf8",
);
assert.match(footerCss, /@media \(min-width: 1200px\)[\s\S]*?\.footerLinks[\s\S]*?flex-wrap: nowrap/);
assert.match(footerCss, /@media \(min-width: 1200px\)[\s\S]*?\.footerLinks[\s\S]*?justify-content: flex-start/);
assert.match(
  globalsCss,
  /\.image-frame\s*\{[\s\S]*?border:\s*0;[\s\S]*?box-shadow:\s*none;[\s\S]*?\}/,
  "Image frame should not render border or box shadow",
);
assert.match(
  globalsCss,
  /\.reader-masthead h1\s*\{[\s\S]*?color:\s*#111111;[\s\S]*?\}/,
  "Reader title should remain black",
);
assert.doesNotMatch(bookReaderSource, /reader-author-link|作者のページ/, "Reader masthead should not show the author page link");

assert.doesNotMatch(inlineEditorSource, /paragraphId\(index\)|`paragraph-\$\{index/, "editor ids must not depend on an array index");
assert.match(inlineEditorSource, /onPasteAutoFormat|normalizePastedText/, "plain-text paste should use the structural formatter");
assert.match(dashboardEditorSource, /stalePendingImageIds|editor-pending-warning/, "stale pending images should be surfaced in the editor");

console.log("beta verification: OK");
