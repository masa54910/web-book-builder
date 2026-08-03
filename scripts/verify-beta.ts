import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import { canReadPublishedBook } from "../src/lib/accessControl";
import {
  buildBookProject,
  contentBlocksFromLegacy,
  contentBlocksToRawText,
  type BookContentBlock,
  type UploadedBookImage,
} from "../src/lib/bookProject";
import { parseBookProjectJson } from "../src/lib/bookProjectNormalization";
import { BETA_LIMITS } from "../src/lib/limits";
import { createSlugCandidate, validateSlug } from "../src/lib/slug";
import { validateImportFile, validateZipPath } from "../src/lib/fileImport";
import { buildReaderPages } from "../src/lib/paginateText";
import { createPendingImageBlock, insertImageBlocksAtCursor } from "../src/lib/inlineContentBlocks";
import { resolveSafeInternalReturnPath } from "../src/lib/returnTo";

function blockSignature(blocks: BookContentBlock[]) {
  return blocks.map((block) =>
    block.type === "text" ? `text:${block.content.replace(/\n+/g, " ").trim()}` : `image:${block.id}`,
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
assert.equal(validateSlug("dashboard").includes("予約"), true, "Reserved slug must be rejected");
assert.equal(validateSlug("safe-book-01"), "", "Safe slug should pass");

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
    uploadState: "ready",
  },
  { id: "text-002", type: "text", content: "中間の段落" },
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

const projectWithBlocks = buildBookProject({
  title: "順序検証",
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
}

assert.equal(resolveSafeInternalReturnPath("/dashboard/books/abc/edit"), "/dashboard/books/abc/edit");
assert.equal(resolveSafeInternalReturnPath("//evil.example/path"), "/dashboard");
assert.equal(resolveSafeInternalReturnPath("https://evil.example/path"), "/dashboard");
assert.equal(resolveSafeInternalReturnPath("reader"), "/dashboard");

const globalsCss = fs.readFileSync(path.join(process.cwd(), "src", "app", "globals.css"), "utf8");
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
assert.match(
  globalsCss,
  /\.reader-author-link\s*\{[\s\S]*?font-size:\s*15px;[\s\S]*?\}/,
  "Author link should keep enlarged font size",
);

console.log("beta verification: OK");
