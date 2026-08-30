import assert from "node:assert/strict";

import {
  buildBookProject,
  contentBlocksToRawText,
  createColumnsBlock,
  ensureUniqueContentBlockIds,
  extractChaptersFromText,
  type BookColumnChildBlock,
  type BookProject,
  swapColumnsBlock,
  unwrapColumnsBlock,
  type BookContentBlock,
} from "../src/lib/bookProject";
import {
  canonicalContentBlocksToEditorBlocks,
  canonicalPayloadToBookProjectInput,
  type CanonicalBookPayload,
} from "../src/lib/canonicalBook";
import { smartFormatContentBlocks } from "../src/lib/smartFormat";
import { buildEditorDraftFields, seedFromDraftFields, type EditorDraftState } from "../src/lib/editorDraftState";
import { buildReaderPages, uniqueReaderPages } from "../src/lib/paginateText";
import { filterPublishedProject } from "../src/lib/publishedReaderSecurity";
import { applyTextMark } from "../src/lib/textStyles";

function text(id: string, content: string) {
  return { id, type: "text" as const, content };
}

const columns = createColumnsBlock();
columns.ratio = "40-60";
columns.left.blocks = [{
  ...text("left-heading", "左カラム\n改行を保持"),
  marks: applyTextMark("左カラム\n改行を保持", undefined, 0, 4, { bold: true, color: "#1677B8", fontSize: "large" }),
}];
columns.right.blocks = [text("right-body", "右カラムの本文")];

const source: BookContentBlock[] = [
  text("before", "導入"),
  columns,
  { id: "after", type: "paywall" },
  text("tail", "続き"),
];

const duplicateIds: BookContentBlock[] = [
  text("same", "上"),
  {
    ...columns,
    id: "same",
    left: { blocks: [text("same", "左")] },
    right: { blocks: [text("same", "右")] },
  },
];
const repaired = ensureUniqueContentBlockIds(duplicateIds);
const repairedIds = repaired.flatMap((block) => block.type === "columns"
  ? [block.id, ...block.left.blocks.map((child) => child.id), ...block.right.blocks.map((child) => child.id)]
  : [block.id]);
assert.equal(new Set(repairedIds).size, repairedIds.length, "top-level and nested block ids must be globally unique");
assert.equal(repaired[0].id, "same", "the first valid id is preserved");

const duplicatePageFixture = buildReaderPages({
  chapters: [{ id: "chapter-1", order: 1, title: "本文", slug: "chapter-1", source: "fixture", body: "本文" }],
  images: [],
  charactersPerPage: 380,
  tableOfContentsItemsPerPage: 12,
});
assert.equal(new Set(duplicatePageFixture.map((page) => page.id)).size, duplicatePageFixture.length, "buildReaderPages must emit unique page ids");
assert.equal(uniqueReaderPages([...duplicatePageFixture, ...duplicatePageFixture]).length, duplicatePageFixture.length, "Mini Preview must keep one page cycle after repeated updates");

// Plain-text paste keeps an entire manuscript in one canonical text block.
// Pagination must use each parsed chapter body once instead of reusing the
// catch-all block range for every chapter (which made Mini Preview loop back
// through the same content after the first cycle).
const plainManuscript = Array.from({ length: 8 }, (_, index) =>
  `第${index + 1}章 テスト\n\n固有本文マーカー${index + 1}。` + "本文の確認です。".repeat(12),
).join("\n\n");
const plainBlocks = [text("plain-manuscript", plainManuscript)];
const plainChapters = extractChaptersFromText(contentBlocksToRawText(plainBlocks), "本文", plainBlocks);
const plainPages = buildReaderPages({
  chapters: plainChapters,
  images: [],
  contentBlocks: plainBlocks,
  charactersPerPage: 380,
  tableOfContentsItemsPerPage: 12,
});
const plainPageText = plainPages
  .filter((page): page is Extract<typeof page, { kind: "text" }> => page.kind === "text")
  .flatMap((page) => page.paragraphs)
  .join("\n");
for (let index = 1; index <= 8; index += 1) {
  assert.equal(
    plainPageText.match(new RegExp(`固有本文マーカー${index}`, "g"))?.length,
    1,
    `plain-text chapter ${index} must be paginated once`,
  );
}

assert.deepEqual(swapColumnsBlock(columns).left.blocks, columns.right.blocks);
assert.deepEqual(unwrapColumnsBlock(columns).map((block) => block.id), ["left-heading", "right-body"]);
assert.match(contentBlocksToRawText(source), /左カラム\n改行を保持[\s\S]*右カラムの本文/);

const smart = smartFormatContentBlocks(source);
assert.equal(smart.blocks[1].type, "columns");
if (smart.blocks[1].type === "columns") {
  assert.equal(smart.blocks[1].left.blocks[0].type, "text");
  assert.equal(smart.blocks[1].right.blocks[0].type, "text");
  if (smart.blocks[1].left.blocks[0].type === "text" && smart.blocks[1].right.blocks[0].type === "text") {
    assert.equal(smart.blocks[1].left.blocks[0].content, "左カラム\n改行を保持");
    assert.equal(smart.blocks[1].left.blocks[0].marks?.[0]?.bold, true, "Smart Format must preserve nested bold marks");
    assert.equal(smart.blocks[1].left.blocks[0].marks?.[0]?.color, "#1677B8", "Smart Format must preserve nested color marks");
    assert.equal(smart.blocks[1].left.blocks[0].marks?.[0]?.fontSize, "large", "Smart Format must preserve nested size marks");
    assert.equal(smart.blocks[1].right.blocks[0].content, "右カラムの本文");
  }
}
assert.equal(smart.blocks[2].type, "paywall", "paywall order is preserved around columns");

const payload: CanonicalBookPayload = {
  title: "Columns fixture",
  subtitle: "",
  authorName: "",
  description: "",
  publisherName: "",
  publishedAt: "",
  copyrightText: "",
  slug: "columns-fixture",
  language: "ja",
  theme: "classic" as CanonicalBookPayload["theme"],
  themeSettings: {},
  coverDesign: {} as CanonicalBookPayload["coverDesign"],
  pageAdjustments: [],
  bindingDirection: "rtl",
  readerMode: "book",
  charactersPerPage: 380,
  tableOfContentsItemsPerPage: 12,
  contentBlocks: source.map((block) => {
    if (block.type === "columns") {
      return {
        id: block.id,
        type: "columns",
        ratio: block.ratio,
        left: { blocks: block.left.blocks.map((child) => ({ ...child })) },
        right: { blocks: block.right.blocks.map((child) => ({ ...child })) },
      };
    }
    return block.type === "paywall" ? { id: block.id, type: "paywall" } : block;
  }) as CanonicalBookPayload["contentBlocks"],
  assets: [],
  externalLinks: [],
  authorHandle: "",
  authorBio: "",
  authorWebsiteUrl: "",
  authorXUrl: "",
  authorNoteUrl: "",
  externalSalesUrl: "",
  externalSalesLabel: "",
  publication: { status: "draft", visibility: "private" },
};

const roundTripInput = canonicalPayloadToBookProjectInput(payload);
assert.equal(roundTripInput.contentBlocks?.[1].type, "columns");
const built = buildBookProject(roundTripInput);
assert.equal(built.ok, true);
if (built.ok) {
  assert.equal(built.project.contentBlocks?.[1].type, "columns");
  const styledPages = buildReaderPages({
    chapters: built.project.chapters,
    images: built.project.images,
    contentBlocks: built.project.contentBlocks,
    charactersPerPage: 380,
    tableOfContentsItemsPerPage: 12,
  });
  const styledColumnsPage = styledPages.find((page) => page.kind === "columns");
  assert.equal(styledColumnsPage?.kind, "columns");
  if (styledColumnsPage?.kind === "columns") {
    const styledChild = styledColumnsPage.left.find((child) => child.kind === "text");
    assert.equal(styledChild?.kind, "text");
    if (styledChild?.kind === "text") {
      assert.equal(styledChild.paragraphRuns?.[0]?.[0]?.bold, true, "Reader columns must retain bold marks");
      assert.equal(styledChild.paragraphRuns?.[0]?.[0]?.color, "#1677B8", "Reader columns must retain color marks");
      assert.equal(styledChild.paragraphRuns?.[0]?.[0]?.fontSize, "large", "Reader columns must retain size marks");
    }
  }
  const editorBlocks = canonicalContentBlocksToEditorBlocks(payload);
  assert.equal(editorBlocks[1].type, "columns");
  if (editorBlocks[1].type === "columns") {
    const styled = editorBlocks[1].left.blocks[0];
    assert.equal(styled.type, "text");
    if (styled.type === "text") {
      assert.equal(styled.marks?.[0]?.bold, true, "nested text bold mark must survive canonical round-trip");
      assert.equal(styled.marks?.[0]?.color, "#1677B8", "nested text color mark must survive canonical round-trip");
      assert.equal(styled.marks?.[0]?.fontSize, "large", "nested text size mark must survive canonical round-trip");
    }
  }
}

const initialState: EditorDraftState = {
  title: "",
  subtitle: "",
  author: "",
  description: "",
  publisherName: "",
  publishedAt: "",
  copyrightText: "",
  rawText: contentBlocksToRawText(source),
  coverImage: undefined,
  coverImageStoragePath: undefined,
  coverFileName: undefined,
  bindingDirection: "rtl",
  theme: "classic" as EditorDraftState["theme"],
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
  coverDesign: {} as EditorDraftState["coverDesign"],
  pageAdjustments: [],
  charactersPerPage: 380,
  tableOfContentsItemsPerPage: 12,
  visibility: "private",
  status: "draft",
  slug: "columns-fixture",
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
const draft = buildEditorDraftFields({ mode: "edit", state: initialState, images: [], contentBlocks: source, draftId: "columns-fixture" });
const restored = seedFromDraftFields({ mode: "edit", initialState, fields: draft });
assert.equal(restored.contentBlocks[1].type, "columns");
if (restored.contentBlocks[1].type === "columns") {
  const styled = restored.contentBlocks[1].left.blocks[0];
  assert.equal(styled.type, "text");
  if (styled.type === "text") {
    assert.equal(styled.marks?.[0]?.bold, true, "nested marks must survive draft Save/Reload");
    assert.equal(styled.marks?.[0]?.color, "#1677B8", "nested color must survive draft Save/Reload");
    assert.equal(styled.marks?.[0]?.fontSize, "large", "nested size must survive draft Save/Reload");
  }
}

// Phase B-1b media fixture: child images and YouTube blocks must survive the
// canonical/editor round-trip and become real Reader pages, not just editor
// decorations. The fixture uses explicit chapter structure so the same path
// exercised by Preview can be asserted deterministically.
const mediaColumns = createColumnsBlock();
const columnImage: Extract<BookColumnChildBlock, { type: "image" }> = {
  id: "column-image-1",
  type: "image",
  storagePath: "storage://books/columns/image-1.jpg",
  fileName: "image-1.jpg",
  mimeType: "image/jpeg",
  width: 1200,
  height: 800,
  fitMode: "contain",
  pageMode: "full-page",
  displaySize: "large",
  uploadState: "ready",
};
const columnYouTube: Extract<BookColumnChildBlock, { type: "youtube" }> = {
  id: "column-youtube-1",
  type: "youtube",
  videoId: "dQw4w9WgXcQ",
  originalUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
  displayMode: "full-page",
  displaySize: "medium",
};
mediaColumns.left.blocks = [
  text("media-left-before", "左カラム本文"),
  columnImage,
];
mediaColumns.right.blocks = [
  text("media-right-before", "右カラム本文"),
  columnYouTube,
];
const mediaSource: BookContentBlock[] = [
  { id: "media-chapter", type: "text", content: "第1章 メディア", structureRole: "chapter" },
  mediaColumns,
  text("media-after", "メディアの後の本文"),
];
const mediaBuild = buildBookProject({
  title: "Columns media fixture",
  subtitle: "",
  author: "Test Author",
  description: "",
  publisherName: "",
  publishedAt: "",
  copyrightText: "",
  rawText: contentBlocksToRawText(mediaSource),
  contentBlocks: mediaSource,
  images: [],
  authorHandle: "test-author",
  language: "ja",
  theme: "classic",
  bindingDirection: "rtl",
  charactersPerPage: 380,
  tableOfContentsItemsPerPage: 12,
});
assert.equal(mediaBuild.ok, true, "columns media fixture should build");
if (mediaBuild.ok) {
  const mediaFlat: Array<BookContentBlock | BookColumnChildBlock> = mediaBuild.project.contentBlocks
    ? [
        ...mediaBuild.project.contentBlocks,
        ...mediaBuild.project.contentBlocks
          .filter((block): block is Extract<BookContentBlock, { type: "columns" }> => block.type === "columns")
          .flatMap((block) => [...block.left.blocks, ...block.right.blocks]),
      ]
    : [];
  assert.deepEqual(
    mediaFlat.filter((block) => block.id === "column-image-1" || block.id === "column-youtube-1").map((block) => block.type),
    ["image", "youtube"],
    "nested media types must remain canonical",
  );
  const mediaPages = buildReaderPages({
    chapters: mediaBuild.project.chapters,
    images: mediaBuild.project.images,
    contentBlocks: mediaBuild.project.contentBlocks,
    charactersPerPage: 380,
    tableOfContentsItemsPerPage: 12,
  });
  const mediaColumnPages = mediaPages.filter((page) => page.kind === "columns");
  assert.equal(mediaColumnPages.length, 1, "Columns must paginate to exactly one ReaderPage");
  assert.equal(mediaPages.filter((page) => page.kind === "image" || page.kind === "youtube").length, 0, "nested media must not become separate Reader pages");
  const mediaPage = mediaColumnPages[0];
  if (mediaPage?.kind === "columns") {
    assert.equal(mediaPage.ratio, mediaColumns.ratio, "Columns ratio must be preserved");
    assert.deepEqual(mediaPage.left.map((child) => child.id), ["media-left-before", "column-image-1"], "left child order must be preserved");
    assert.deepEqual(mediaPage.right.map((child) => child.id), ["media-right-before", "column-youtube-1"], "right child order must be preserved");
    assert.equal(mediaPage.left[1]?.kind, "image", "nested image must remain on the left pane");
    assert.equal(mediaPage.right[1]?.kind, "youtube", "nested YouTube must remain on the right pane");
  }
  for (const ratio of ["50-50", "40-60", "60-40"] as const) {
    const ratioPages = buildReaderPages({
      chapters: mediaBuild.project.chapters,
      images: mediaBuild.project.images,
      contentBlocks: [{ ...mediaColumns, ratio }],
      charactersPerPage: 380,
      tableOfContentsItemsPerPage: 12,
    });
    const ratioPage = ratioPages.find((page) => page.kind === "columns");
    assert.equal(ratioPage?.kind, "columns");
    if (ratioPage?.kind === "columns") assert.equal(ratioPage.ratio, ratio, `${ratio} ratio must round-trip to ReaderPage`);
  }
  const emptyLeft = { ...mediaColumns, id: "columns-empty-left", left: { blocks: [] } };
  const emptyRight = { ...mediaColumns, id: "columns-empty-right", right: { blocks: [] } };
  assert.equal(buildReaderPages({ chapters: mediaBuild.project.chapters, images: mediaBuild.project.images, contentBlocks: [emptyLeft], charactersPerPage: 380, tableOfContentsItemsPerPage: 12 }).filter((page) => page.kind === "columns").length, 1, "empty left pane must not crash");
  assert.equal(buildReaderPages({ chapters: mediaBuild.project.chapters, images: mediaBuild.project.images, contentBlocks: [emptyRight], charactersPerPage: 380, tableOfContentsItemsPerPage: 12 }).filter((page) => page.kind === "columns").length, 1, "empty right pane must not crash");
  assert.ok(mediaPages.some((page) => page.kind === "text" && page.paragraphs.some((paragraph) => paragraph.includes("メディアの後の本文"))), "text after columns should remain in order");

  const ratioChanged = { ...mediaColumns, ratio: "60-40" as const };
  assert.equal(ratioChanged.left.blocks[1]?.id, "column-image-1", "ratio changes must retain left media");
  const swappedMedia = swapColumnsBlock(mediaColumns);
  assert.equal(swappedMedia.left.blocks[1]?.id, "column-youtube-1", "swap must retain and exchange YouTube child");
  assert.deepEqual(unwrapColumnsBlock(mediaColumns).map((block) => block.id), ["media-left-before", "column-image-1", "media-right-before", "column-youtube-1"], "unwrap must retain media order");
  const smartMedia = smartFormatContentBlocks(mediaSource);
  const smartMediaColumns = smartMedia.blocks.find((block) => block.type === "columns");
  assert.equal(smartMediaColumns?.type, "columns");
  if (smartMediaColumns?.type === "columns") {
    assert.equal(smartMediaColumns.left.blocks[1]?.type, "image", "Smart Format must preserve column images");
    assert.equal(smartMediaColumns.right.blocks[1]?.type, "youtube", "Smart Format must preserve column YouTube");
  }

  const mediaDraft = buildEditorDraftFields({ mode: "edit", state: initialState, images: [], contentBlocks: mediaSource, draftId: "columns-media-fixture" });
  const restoredMediaDraft = seedFromDraftFields({ mode: "edit", initialState, fields: mediaDraft });
  const restoredMediaColumns = restoredMediaDraft.contentBlocks.find((block) => block.type === "columns");
  assert.equal(restoredMediaColumns?.type, "columns");
if (restoredMediaColumns?.type === "columns") {
    assert.equal(restoredMediaColumns.left.blocks[1]?.type, "image", "draft reload must preserve column image");
    assert.equal(restoredMediaColumns.right.blocks[1]?.type, "youtube", "draft reload must preserve column YouTube");
  }

  const mediaCanonicalPayload: CanonicalBookPayload = {
    ...payload,
    title: "Columns media canonical fixture",
    contentBlocks: [
      { id: "media-chapter", type: "text", content: "第1章 メディア", structureRole: "chapter" },
      {
        id: mediaColumns.id,
        type: "columns",
        ratio: mediaColumns.ratio,
        left: {
          blocks: [
            { id: "media-left-before", type: "text", content: "左カラム本文" },
            { id: "column-image-1", type: "image", assetId: "column-image-1", pageMode: "full-page", displaySize: "large", fitMode: "contain" },
          ],
        },
        right: {
          blocks: [
            { id: "media-right-before", type: "text", content: "右カラム本文" },
            { id: "column-youtube-1", type: "youtube", videoId: "dQw4w9WgXcQ", originalUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", displayMode: "full-page", displaySize: "medium" },
          ],
        },
      },
      { id: "media-after", type: "text", content: "メディアの後の本文" },
    ],
    assets: [{ id: "column-image-1", storagePath: "storage://books/columns/image-1.jpg", fileName: "image-1.jpg", mimeType: "image/jpeg", width: 1200, height: 800 }],
  };
  const canonicalMediaBuild = buildBookProject(canonicalPayloadToBookProjectInput(mediaCanonicalPayload));
  assert.equal(canonicalMediaBuild.ok, true, "canonical media payload should rebuild");
  if (canonicalMediaBuild.ok) {
    const canonicalMedia = canonicalMediaBuild.project.contentBlocks?.find((block) => block.type === "columns");
    assert.equal(canonicalMedia?.type, "columns");
    if (canonicalMedia?.type === "columns") {
      assert.equal(canonicalMedia.left.blocks[1]?.type, "image");
      assert.equal(canonicalMedia.right.blocks[1]?.type, "youtube");
    }
  }

  const pendingColumns = createColumnsBlock();
  pendingColumns.left.blocks = [{
    ...columnImage,
    id: "pending-column-image",
    storagePath: "",
    uploadState: "pending",
  }];
  const pendingBuild = buildBookProject({
    title: "Pending columns fixture",
    subtitle: "",
    author: "Test Author",
    description: "",
    publisherName: "",
    publishedAt: "",
    copyrightText: "",
    rawText: contentBlocksToRawText([pendingColumns]),
    contentBlocks: [pendingColumns],
    images: [],
    authorHandle: "test-author",
    language: "ja",
    theme: "classic",
    bindingDirection: "rtl",
    charactersPerPage: 380,
    tableOfContentsItemsPerPage: 12,
  });
  assert.equal(pendingBuild.ok, false, "pending nested image must keep Save/Preview guarded");
}

// A paywall before a Columns block must remove all later child media from the
// filtered published payload, including storage paths and YouTube IDs.
const securedProject = (mediaBuild.ok ? mediaBuild.project : undefined) as BookProject | undefined;
if (securedProject) {
  const securedBlocks: BookContentBlock[] = [
    text("free-text", "無料本文"),
    { id: "paywall-secure", type: "paywall" },
    mediaColumns,
  ];
  const securedProjectWithBlocks = { ...securedProject, contentBlocks: securedBlocks };
  const filtered = filterPublishedProject(securedProjectWithBlocks, 1, false);
  const filteredJson = JSON.stringify(filtered.project);
  assert.equal(filtered.blocks.some((block) => block.id === mediaColumns.id), false, "paid columns must not remain in published blocks");
  assert.equal(filteredJson.includes("column-image-1"), false, "paid image id must not leak");
  assert.equal(filteredJson.includes("storage://books/columns/image-1.jpg"), false, "paid image path must not leak");
  assert.equal(filteredJson.includes("dQw4w9WgXcQ"), false, "paid YouTube id must not leak");
}

console.log("verify-columns: PASS (ratios, roundtrip, recursive ids, smart format order, line breaks, swap/unpack, draft persistence, nested image/youtube preview, pending guard, paywall filtering)");
