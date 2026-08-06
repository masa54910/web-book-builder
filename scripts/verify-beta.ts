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
import { validateRequiredBookFields } from "../src/lib/editorValidation";
import { computeInlineImagePopoverLayout } from "../src/lib/inlineImagePopover";
import { buildEditorDraftFields, seedFromDraftFields, type EditorDraftState } from "../src/lib/editorDraftState";

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

const requiredBase = {
  title: "Title",
  authorName: "Author",
  description: "Description",
  authorHandle: "author",
  slug: "safe-book-01",
};
const requiredMissingTitle = validateRequiredBookFields({ ...requiredBase, title: "   " });
assert.equal(requiredMissingTitle.isValid, false);
assert.equal(requiredMissingTitle.globalError, "未入力の必須項目があります。");
assert.equal(requiredMissingTitle.fieldErrors.title, "タイトルを入力してください。");
assert.equal(requiredMissingTitle.firstMissingField, "title");

const requiredMissingAuthor = validateRequiredBookFields({ ...requiredBase, authorName: "  " });
assert.equal(requiredMissingAuthor.isValid, false);
assert.equal(requiredMissingAuthor.fieldErrors.author, "著者名を入力してください。");

const requiredMissingDescription = validateRequiredBookFields({ ...requiredBase, description: "\t" });
assert.equal(requiredMissingDescription.fieldErrors.description, "説明文を入力してください。");

const requiredMissingAuthorHandle = validateRequiredBookFields({ ...requiredBase, authorHandle: "  " });
assert.equal(requiredMissingAuthorHandle.fieldErrors.authorHandle, "作者ハンドルを入力してください。");

const requiredMissingSlug = validateRequiredBookFields({ ...requiredBase, slug: "\n" });
assert.equal(requiredMissingSlug.fieldErrors.slug, "公開URLを入力してください。");

const invalidHandle = validateRequiredBookFields({ ...requiredBase, authorHandle: "日本語" });
assert.equal(invalidHandle.isValid, false);
assert.equal(invalidHandle.globalError, "");
assert.equal(invalidHandle.fieldErrors.authorHandle, "作者ハンドルは半角英数字とハイフンで入力してください。");

const invalidShortHandle = validateRequiredBookFields({ ...requiredBase, authorHandle: "a" });
assert.equal(invalidShortHandle.fieldErrors.authorHandle, "作者ハンドルは半角英数字とハイフンで入力してください。");

const invalidSlug = validateRequiredBookFields({ ...requiredBase, slug: "my book" });
assert.equal(invalidSlug.isValid, false);
assert.equal(invalidSlug.fieldErrors.slug, "公開URLは半角英数字とハイフンで入力してください。");

const requiredBothPresent = validateRequiredBookFields(requiredBase);
assert.equal(requiredBothPresent.isValid, true);
assert.equal(requiredBothPresent.globalError, "");
assert.deepEqual(requiredBothPresent.fieldErrors, {});

// The editor uses this result as the save/publish gate: an invalid payload
// must return before either canonical command can be called.
assert.equal(requiredMissingTitle.isValid, false);
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
  slug: "",
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

const draftBlocks: BookContentBlock[] = [
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
