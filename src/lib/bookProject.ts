import type {
  BookConfig,
  BookPublicationStatus,
  BookPublicationVisibility,
} from "@/config/bookConfig";
import { normalizeLocale, type SupportedLocale } from "@/lib/localization";
import type { BookThemeSettings } from "@/lib/themeSystem";
import {
  DEFAULT_BRANDING,
  DEFAULT_MONETIZATION,
  normalizeHandle,
  safeExternalUrl,
  type ExternalLink,
} from "@/lib/productTypes";
import { createSlugCandidate } from "@/lib/slug";
import type { ImageManifestRow, NovelChapter } from "@/lib/types";
import { normalizeCoverDesign, type CoverDesign } from "@/lib/coverDesign";
import { normalizePageAdjustments, type PageAdjustment } from "@/lib/pageAdjustments";
import { isValidYouTubeVideoId } from "@/lib/youtube";
import { normalizeTextMarks, type TextMark } from "@/lib/textStyles";
import { findDocumentHeadings, parseDocumentHeading, parseDocumentStructure } from "@/lib/documentStructure";

export const BOOK_PROJECT_VERSION = 1;

export type MediaDisplayMode = "inline" | "full-page";
export type MediaDisplaySize = "small" | "medium" | "large" | "full";

export function normalizeMediaDisplaySize(value: unknown): MediaDisplaySize {
  return value === "small" || value === "large" || value === "full" ? value : "medium";
}

export type BookContentTextBlock = {
      id: string;
      type: "text";
      content: string;
      marks?: TextMark[];
      structureRole?: "chapter" | "subheading";
    };

export type BookContentImageBlock = {
      id: string;
      type: "image";
      storagePath: string;
      publicUrl?: string;
      fileName: string;
      mimeType: string;
      width: number;
      height: number;
      caption?: string;
      altText?: string;
      fitMode: "contain" | "cover";
      pageMode: "inline" | "full-page";
      displaySize?: MediaDisplaySize;
      uploadState?: "pending" | "ready" | "error";
      errorMessage?: string;
    };

export type BookContentYouTubeBlock = {
      id: string;
      type: "youtube";
      videoId: string;
      originalUrl: string;
      displayMode?: MediaDisplayMode;
      displaySize?: MediaDisplaySize;
    };

/** Columns intentionally allow only renderable media/text children. */
export type BookColumnChildBlock = BookContentTextBlock | BookContentImageBlock | BookContentYouTubeBlock;
export type ColumnsRatio = "50-50" | "40-60" | "60-40";

export type BookColumnsBlock = {
  id: string;
  type: "columns";
  ratio: ColumnsRatio;
  left: { blocks: BookColumnChildBlock[] };
  right: { blocks: BookColumnChildBlock[] };
};

export type BookContentBlock =
  | BookContentTextBlock
  | BookContentImageBlock
  | BookContentYouTubeBlock
  | {
      id: string;
      type: "paywall";
      /** Stable structural anchors derived from the ordered block sequence. */
      previousBlockId?: string;
      nextBlockId?: string;
      chapterId?: string;
    }
  | BookColumnsBlock;

/** Create a stable-looking editor block id without depending on array position. */
export function createContentBlockId(prefix: string) {
  const randomUUID = globalThis.crypto?.randomUUID;
  if (typeof randomUUID === "function") return `${prefix}-${randomUUID.call(globalThis.crypto)}`;
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/** Keep the first valid occurrence and repair only missing/duplicate ids. */
export function ensureUniqueContentBlockIds(blocks: BookContentBlock[]) {
  const used = new Set<string>();
  const repair = (block: BookContentBlock | BookColumnChildBlock): BookContentBlock | BookColumnChildBlock => {
    const original = typeof block.id === "string" ? block.id.trim() : "";
    const prefix = block.type === "image" ? "image" : block.type === "youtube" ? "youtube" : block.type === "paywall" ? "paywall" : block.type === "columns" ? "columns" : "paragraph";
    let nextBlock: BookContentBlock | BookColumnChildBlock = block;
    if (original && !used.has(original)) {
      used.add(original);
      nextBlock = original === block.id ? block : { ...block, id: original } as typeof block;
    } else {
      let next = createContentBlockId(prefix);
      while (used.has(next)) next = createContentBlockId(prefix);
      used.add(next);
      nextBlock = { ...block, id: next } as typeof block;
    }
    if (nextBlock.type !== "columns") return nextBlock;
    return {
      ...nextBlock,
      left: { blocks: nextBlock.left.blocks.map((child) => repair(child) as BookColumnChildBlock) },
      right: { blocks: nextBlock.right.blocks.map((child) => repair(child) as BookColumnChildBlock) },
    };
  };
  return blocks.map((block) => repair(block) as BookContentBlock);
}

export function flattenContentBlocks(blocks: BookContentBlock[]): BookContentBlock[] {
  return blocks.flatMap((block) => block.type === "columns"
    ? [block, ...flattenContentBlocks(block.left.blocks as BookContentBlock[]), ...flattenContentBlocks(block.right.blocks as BookContentBlock[])]
    : [block]);
}

export function normalizeColumnsRatio(value: unknown): ColumnsRatio {
  return value === "40-60" || value === "60-40" ? value : "50-50";
}

export function createColumnsBlock(): BookColumnsBlock {
  return {
    id: createContentBlockId("columns"),
    type: "columns",
    ratio: "50-50",
    left: { blocks: [{ id: createContentBlockId("paragraph"), type: "text", content: "" }] },
    right: { blocks: [{ id: createContentBlockId("paragraph"), type: "text", content: "" }] },
  };
}

export function swapColumnsBlock(block: BookColumnsBlock): BookColumnsBlock {
  return { ...block, left: block.right, right: block.left };
}

export function unwrapColumnsBlock(block: BookColumnsBlock): BookContentBlock[] {
  return [...(block.left.blocks as BookContentBlock[]), ...(block.right.blocks as BookContentBlock[])];
}

export type UploadedBookImage = {
  id: string;
  fileName: string;
  dataUrl: string;
  /** Canonical persisted Storage reference/path, kept separate from displayUrl. */
  storagePath?: string;
  /** Runtime-only display URL (data/blob/http). Never persist signed URLs. */
  displayUrl?: string;
  mimeType: string;
  size: number;
  caption: string;
  insertChapter: string;
  orderInChapter: number;
};

export type BookProject = {
  version: number;
  config: BookConfig;
  chapters: NovelChapter[];
  rawText: string;
  contentBlocks?: BookContentBlock[];
  images: ImageManifestRow[];
  missingImageIds: string[];
  createdAt: string;
  updatedAt: string;
};

export type BookProjectInput = {
  title: string;
  slug?: string;
  publicationStatus?: BookPublicationStatus;
  publicationVisibility?: BookPublicationVisibility;
  subtitle: string;
  author: string;
  description: string;
  publisherName: string;
  publishedAt: string;
  copyrightText: string;
  rawText: string;
  coverImage?: string;
  bindingDirection: BookConfig["bindingDirection"];
  theme: BookConfig["theme"];
  language?: SupportedLocale;
  themeSettings?: Partial<BookThemeSettings>;
  coverDesign?: CoverDesign;
  pageAdjustments?: PageAdjustment[];
  charactersPerPage: number;
  tableOfContentsItemsPerPage: number;
  images: UploadedBookImage[];
  contentBlocks?: BookContentBlock[];
  authorHandle?: string;
  authorBio?: string;
  authorWebsiteUrl?: string;
  authorXUrl?: string;
  authorNoteUrl?: string;
  externalLinks?: ExternalLink[];
  externalSalesUrl?: string;
  externalSalesLabel?: string;
  existingBookId?: string;
  existingCreatedAt?: string;
  publicationRevision?: number;
};

export type ProjectBuildResult =
  | { ok: true; project: BookProject }
  | { ok: false; errors: Record<string, string> };

const IMAGE_REFERENCE_PATTERN = /\[\[image:([A-Za-z0-9._-]+)(?:\|([^\]|]*))?(?:\|(inline|full-page))?(?:\|(small|medium|large|full))?\]\]/g;

function blockId(prefix: string) {
  return createContentBlockId(prefix);
}

function normalizeBlockId(value: string, fallbackPrefix: string) {
  const candidate =
    value
      .normalize("NFKD")
      .toLowerCase()
      .replace(/[^a-z0-9._-]+/g, "-")
      .replace(/^-+|-+$/g, "") || blockId(fallbackPrefix);
  return candidate;
}

function slugify(value: string, fallback: string) {
  const slug = value
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^\p{Letter}\p{Number}]+/gu, "-")
    .replace(/^-+|-+$/g, "");
  return slug || fallback;
}

function uniqueSlug(title: string, order: number, used: Set<string>) {
  const base = slugify(title, `chapter-${String(order).padStart(2, "0")}`);
  let slug = base;
  let suffix = 2;
  while (used.has(slug)) {
    slug = `${base}-${suffix}`;
    suffix += 1;
  }
  used.add(slug);
  return slug;
}

function normalizeAuthorHandle(value: string, author: string) {
  const fallback = createSlugCandidate(author);
  const candidate = normalizeHandle(value, fallback);
  return /^[a-z0-9][a-z0-9_-]{1,39}$/.test(candidate) ? candidate : fallback;
}

function stableBookId(title: string, author: string, previous?: string) {
  if (previous) return previous;
  const base = slugify(`${title}-${author}`, "untitled-book");
  return `preview-${base}`;
}

function normalizeLineBreaks(value: string) {
  return value.replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n").trim();
}

function isRenderableBlock(block: BookContentBlock) {
  if (block.type === "text") return Boolean(block.content.trim());
  if (block.type === "columns") return block.left.blocks.length > 0 || block.right.blocks.length > 0;
  return true;
}

function chapterHeadingBlock(blocks: BookContentBlock[], index: number) {
  for (let cursor = index - 1; cursor >= 0; cursor -= 1) {
    const block = blocks[cursor];
    if (block.type !== "text") continue;
    if (block.structureRole === "chapter") return block;
    const heading = parseDocumentHeading(block.content.split("\n", 1)[0] || "");
    if (heading?.level === 1) return block;
  }
  return undefined;
}

/**
 * Recompute Paywall anchors from the canonical ordered block sequence. Empty
 * editor paragraphs are intentionally skipped because they do not produce a
 * Reader page and cannot be used as a pagination anchor.
 */
export function normalizePaywallAnchors(blocks: BookContentBlock[]) {
  return blocks.map((block, index) => {
    if (block.type !== "paywall") return block;
    let previousBlockId: string | undefined;
    for (let cursor = index - 1; cursor >= 0; cursor -= 1) {
      if (isRenderableBlock(blocks[cursor])) {
        previousBlockId = blocks[cursor].id;
        break;
      }
    }
    let nextBlockId: string | undefined;
    let nextBlock: BookContentBlock | undefined;
    for (let cursor = index + 1; cursor < blocks.length; cursor += 1) {
      if (isRenderableBlock(blocks[cursor])) {
        nextBlockId = blocks[cursor].id;
        nextBlock = blocks[cursor];
        break;
      }
    }
    const nextHeading = nextBlock?.type === "text"
      ? parseDocumentHeading(nextBlock.content.split("\n", 1)[0] || "")
      : undefined;
    const chapter = nextHeading?.level === 1
      ? nextBlock
      : chapterHeadingBlock(blocks, index);
    return {
      ...block,
      previousBlockId,
      nextBlockId,
      chapterId: chapter?.id,
    };
  });
}

function normalizeContentBlocks(blocks: BookContentBlock[]) {
  const normalized: BookContentBlock[] = [];
  let paywallSeen = false;

  for (const [index, block] of blocks.entries()) {
    if (block.type === "columns") {
      const normalizeChild = (child: BookColumnChildBlock, childIndex: number): BookColumnChildBlock | null => {
        if (child?.type === "text") {
          return {
            id: typeof child.id === "string" ? child.id : blockId("paragraph"),
            type: "text",
            content: typeof child.content === "string" ? child.content : "",
            marks: normalizeTextMarks(typeof child.content === "string" ? child.content : "", child.marks),
            structureRole: child.structureRole === "chapter" || child.structureRole === "subheading" ? child.structureRole : undefined,
          };
        }
        if (child?.type === "youtube") {
          if (!isValidYouTubeVideoId(child.videoId)) return null;
          return {
            id: typeof child.id === "string" ? child.id : blockId("youtube"),
            type: "youtube",
            videoId: child.videoId,
            originalUrl: typeof child.originalUrl === "string" ? child.originalUrl : `https://www.youtube.com/watch?v=${child.videoId}`,
            displayMode: child.displayMode === "inline" ? "inline" : "full-page",
            displaySize: normalizeMediaDisplaySize(child.displaySize),
          };
        }
        if (child?.type !== "image") return null;
        const storagePath = typeof child.storagePath === "string" && child.storagePath ? child.storagePath : child.publicUrl || "";
        const uploadState = child.uploadState === "pending" || child.uploadState === "error" || child.uploadState === "ready" ? child.uploadState : undefined;
        if (!storagePath && uploadState !== "pending" && uploadState !== "error") return null;
        return {
          id: typeof child.id === "string" ? child.id : blockId("image"),
          type: "image",
          storagePath,
          publicUrl: typeof child.publicUrl === "string" && child.publicUrl ? child.publicUrl : undefined,
          fileName: child.fileName || `image-${index + childIndex + 1}`,
          mimeType: child.mimeType || "image/jpeg",
          width: Number.isFinite(child.width) && child.width > 0 ? child.width : 1200,
          height: Number.isFinite(child.height) && child.height > 0 ? child.height : 800,
          caption: child.caption?.trim() || undefined,
          altText: child.altText?.trim() || undefined,
          fitMode: child.fitMode === "cover" ? "cover" : "contain",
          pageMode: child.pageMode === "inline" ? "inline" : "full-page",
          displaySize: normalizeMediaDisplaySize(child.displaySize),
          uploadState,
          errorMessage: child.errorMessage?.trim() || undefined,
        };
      };
      const left = Array.isArray(block.left?.blocks) ? block.left.blocks.map(normalizeChild).filter((child): child is BookColumnChildBlock => Boolean(child)) : [];
      const right = Array.isArray(block.right?.blocks) ? block.right.blocks.map(normalizeChild).filter((child): child is BookColumnChildBlock => Boolean(child)) : [];
      normalized.push({ id: normalizeBlockId(block.id, "columns"), type: "columns", ratio: normalizeColumnsRatio(block.ratio), left: { blocks: left }, right: { blocks: right } });
      continue;
    }
    if (block.type === "text") {
      normalized.push({
        id: normalizeBlockId(block.id, "text"),
        type: "text",
        content: typeof block.content === "string" ? block.content : "",
        marks: normalizeTextMarks(typeof block.content === "string" ? block.content : "", block.marks),
        structureRole: block.structureRole === "chapter" || block.structureRole === "subheading" ? block.structureRole : undefined,
      });
      continue;
    }

    if (block.type === "youtube") {
      if (!isValidYouTubeVideoId(block.videoId)) continue;
      normalized.push({
        id: normalizeBlockId(block.id, "youtube"),
        type: "youtube",
        videoId: block.videoId,
        originalUrl: typeof block.originalUrl === "string" ? block.originalUrl : "",
        displayMode: block.displayMode === "inline" ? "inline" : "full-page",
        displaySize: normalizeMediaDisplaySize(block.displaySize),
      });
      continue;
    }

    if (block.type === "paywall") {
      if (paywallSeen) continue;
      paywallSeen = true;
      normalized.push({ id: normalizeBlockId(block.id, "paywall"), type: "paywall" });
      continue;
    }

    const storagePath =
      typeof block.storagePath === "string" && block.storagePath
        ? block.storagePath
        : block.publicUrl || "";
    const uploadState = block.uploadState === "pending" || block.uploadState === "error" || block.uploadState === "ready" ? block.uploadState : undefined;
    if (!storagePath && uploadState !== "pending" && uploadState !== "error") continue;

    normalized.push({
      id: normalizeBlockId(block.id, "image"),
      type: "image",
      storagePath,
      publicUrl: typeof block.publicUrl === "string" && block.publicUrl ? block.publicUrl : undefined,
      fileName: block.fileName || `image-${index + 1}`,
      mimeType: block.mimeType || "image/jpeg",
      width: Number.isFinite(block.width) && block.width > 0 ? block.width : 1200,
      height: Number.isFinite(block.height) && block.height > 0 ? block.height : 800,
      caption: block.caption?.trim() || undefined,
      altText: block.altText?.trim() || undefined,
      fitMode: block.fitMode === "cover" ? "cover" : "contain",
      pageMode: block.pageMode === "inline" ? "inline" : "full-page",
      displaySize: normalizeMediaDisplaySize(block.displaySize),
      uploadState,
      errorMessage: block.errorMessage?.trim() || undefined,
    });
  }

  return normalizePaywallAnchors(ensureUniqueContentBlockIds(normalized));
}

/** Conservative normalization used for plain-text paste. */
export function normalizePastedText(value: string) {
  return value
    .replace(/^\uFEFF/, "")
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n");
}

export function contentBlocksToRawText(blocks: BookContentBlock[]): string {
  const parts: string[] = blocks.map((block) => {
    if (block.type === "columns") {
      return contentBlocksToRawText([
        ...(block.left.blocks as BookContentBlock[]),
        ...(block.right.blocks as BookContentBlock[]),
      ]);
    }
    if (block.type === "text") {
      return block.content;
    }

    if (block.type === "youtube") {
      const mode = block.displayMode === "inline" ? "inline" : "full-page";
      return `[[youtube:${block.id}|${block.videoId}|${mode}|${normalizeMediaDisplaySize(block.displaySize)}]]`;
    }

    if (block.type === "paywall") return "";

    const caption = block.caption?.trim();
    const mode = block.pageMode === "inline" ? "inline" : "full-page";
    if (caption) {
      return `[[image:${block.id}|${caption}|${mode}|${normalizeMediaDisplaySize(block.displaySize)}]]`;
    }
    return `[[image:${block.id}||${mode}|${normalizeMediaDisplaySize(block.displaySize)}]]`;
  });

  return normalizeLineBreaks(parts.join("\n\n"));
}

/**
 * Remove runtime-only display URLs before a project is written to storage.
 * The canonical storage references remain in storagePath/storage_path/image_url.
 */
export function stripRuntimeAssetUrls(project: BookProject): BookProject {
  return {
    ...project,
    config: {
      ...project.config,
      coverImageUrl: undefined,
    },
    images: project.images.map((image) => ({
      ...image,
      public_url: undefined,
    })),
    contentBlocks: project.contentBlocks?.map((block) => {
      if (block.type === "columns") {
        const stripChild = (child: BookColumnChildBlock) => child.type === "image"
          ? { ...child, publicUrl: undefined }
          : child;
        return {
          ...block,
          left: { blocks: block.left.blocks.map(stripChild) },
          right: { blocks: block.right.blocks.map(stripChild) },
        };
      }
      return block.type === "image"
        ? { ...block, publicUrl: undefined }
        : block;
    }),
  };
}

export function contentBlocksFromLegacy(rawText: string, images: UploadedBookImage[]): BookContentBlock[] {
  const text = normalizeLineBreaks(rawText);
  const imageById = new Map(images.map((image) => [image.id, image]));
  const usedImageIds = new Set<string>();
  const blocks: BookContentBlock[] = [];
  const pattern = /\[\[(image|youtube):([A-Za-z0-9._-]+)(?:\|([^\]|]*))?(?:\|(inline|full-page))?(?:\|(small|medium|large|full))?\]\]/g;
  let cursor = 0;
  let match: RegExpExecArray | null = null;

  while ((match = pattern.exec(text))) {
    const textPart = text.slice(cursor, match.index);
    if (textPart.trim()) {
      blocks.push({
        id: blockId("text"),
        type: "text",
        content: textPart,
      });
    }

    if (match[1] === "youtube") {
      const storedBlockId = match[2];
      const videoId = isValidYouTubeVideoId(match[3] || "") ? match[3] : storedBlockId;
      if (isValidYouTubeVideoId(videoId)) {
        blocks.push({
          id: match[3] ? storedBlockId : blockId("youtube"),
          type: "youtube",
          videoId,
          originalUrl: `https://www.youtube.com/watch?v=${videoId}`,
          displayMode: match[4] === "inline" ? "inline" : "full-page",
          displaySize: normalizeMediaDisplaySize(match[5]),
        });
      }
      cursor = pattern.lastIndex;
      continue;
    }

    const imageId = match[2];
    const image = imageById.get(imageId);
    if (image) {
      usedImageIds.add(image.id);
      blocks.push({
        id: image.id,
        type: "image",
        storagePath: image.storagePath || image.dataUrl,
        publicUrl: image.displayUrl,
        fileName: image.fileName,
        mimeType: image.mimeType || "image/jpeg",
        width: 1200,
        height: 800,
        caption: image.caption || match[3] || undefined,
        altText: image.fileName,
        fitMode: "contain",
        pageMode: match[4] === "inline" ? "inline" : "full-page",
        displaySize: normalizeMediaDisplaySize(match[5]),
        uploadState: "ready",
      });
    } else {
      blocks.push({
        id: blockId("text"),
        type: "text",
        content: match[0],
      });
    }

    cursor = pattern.lastIndex;
  }

  const tail = text.slice(cursor);
  if (tail.trim()) {
    blocks.push({
      id: blockId("text"),
      type: "text",
      content: tail,
    });
  }

  for (const image of images) {
    if (usedImageIds.has(image.id)) continue;
    blocks.push({
      id: image.id || blockId("image"),
      type: "image",
      storagePath: image.storagePath || image.dataUrl,
      publicUrl: image.displayUrl,
      fileName: image.fileName,
      mimeType: image.mimeType || "image/jpeg",
      width: 1200,
      height: 800,
      caption: image.caption || undefined,
      altText: image.fileName,
      fitMode: "contain",
      pageMode: "full-page",
      displaySize: "medium",
      uploadState: "ready",
    });
  }

  if (!blocks.length) {
    blocks.push({
      id: blockId("text"),
      type: "text",
      content: "",
    });
  }

  return normalizeContentBlocks(blocks);
}

export function extractChaptersFromText(rawText: string, fallbackTitle: string, structuredBlocks?: BookContentBlock[]): NovelChapter[] {
  const text = normalizeLineBreaks(rawText);
  if (!text) return [];

  const blocksForStructure = structuredBlocks || [];
  const structuredChapters = blocksForStructure.flatMap((block, index) =>
    block.type === "text" && block.structureRole === "chapter" ? [{ block, index }] : [],
  ) || [];
  if (structuredChapters.length) {
    const usedSlugs = new Set<string>();
    const prefixBlocks = blocksForStructure.slice(0, structuredChapters[0].index);
    return structuredChapters.map(({ block, index }, chapterIndex) => {
      const nextIndex = structuredChapters[chapterIndex + 1]?.index ?? blocksForStructure.length;
      const title = block.type === "text" ? block.content.trim() : `Chapter ${chapterIndex + 1}`;
      const bodyBlocks = [
        ...(chapterIndex === 0 ? prefixBlocks : []),
        ...blocksForStructure.slice(index + 1, nextIndex),
      ];
      const body = contentBlocksToRawText(bodyBlocks).trim();
      const slug = uniqueSlug(title || fallbackTitle, chapterIndex + 1, usedSlugs);
      return {
        id: slug,
        order: chapterIndex + 1,
        title: title || fallbackTitle.trim() || `Chapter ${chapterIndex + 1}`,
        slug,
        source: "browser-input",
        body,
      };
    });
  }
  const structure = parseDocumentStructure(text, fallbackTitle);

  const headings = findDocumentHeadings(text)
    .filter((heading) => heading.level === 1)
    .map((heading) => ({
      index: text.split("\n").slice(0, heading.index).join("\n").length + (heading.index ? 1 : 0),
      raw: heading.line,
      title: heading.title,
    }));
  const usedSlugs = new Set<string>();

  if (!headings.length) {
    const title = fallbackTitle.trim() || "本文";
    return [
      {
        id: "chapter-01",
        order: 1,
        title,
        slug: uniqueSlug(title, 1, usedSlugs),
        source: "browser-input",
        body: text,
      },
    ];
  }

  return headings.map((heading, index) => {
    const order = index + 1;
    const title = heading.title.trim() || `Chapter ${order}`;
    const bodyStart = heading.index + heading.raw.length;
    const bodyEnd = headings[index + 1]?.index ?? text.length;
    const prefix = index === 0 ? text.slice(0, heading.index).trim() : "";
    const sectionBody = text.slice(bodyStart, bodyEnd).trim();
    const body = [prefix, sectionBody].filter(Boolean).join("\n\n");
    const slug = uniqueSlug(title, order, usedSlugs);
    const sections = structure.chapters[index]?.sections.map((entry) => ({ id: entry.id, title: entry.title, level: entry.level as 2 | 3 })) || [];
    return {
      id: slug,
      order,
      title,
      slug,
      source: "browser-input",
      body,
      sections: sections.length ? sections : undefined,
    };
  });
}

export function findImageReferenceIds(rawText: string) {
  return [...rawText.matchAll(IMAGE_REFERENCE_PATTERN)].map((match) => match[1]);
}

function buildImageRows(images: UploadedBookImage[]): ImageManifestRow[] {
  return images.map((image, index) => ({
    chapter_order: Number(image.insertChapter) || 0,
    chapter_title: image.insertChapter,
    image_index: image.id || `image-${index + 1}`,
    image_id: image.id || `image-${index + 1}`,
    image_url: image.storagePath || image.dataUrl,
    storage_path: image.storagePath || image.dataUrl,
    public_url: image.displayUrl,
    alt: image.fileName,
    caption: image.caption,
    source_path: image.fileName,
    local_path: "",
  }));
}

function imageRowsFromBlocks(blocks: BookContentBlock[], legacyImages: UploadedBookImage[]) {
  const legacyById = new Map(legacyImages.map((image) => [image.id, image]));
  return flattenContentBlocks(blocks)
    .filter((block): block is Extract<BookContentBlock, { type: "image" }> => block.type === "image")
    .map((block) => {
      const legacy = legacyById.get(block.id);
      const imageUrl = block.storagePath || legacy?.storagePath || legacy?.dataUrl || "";
      const source = block.fileName || legacy?.fileName || block.id;
      const caption = block.caption || legacy?.caption || "";

      const row: ImageManifestRow = {
        chapter_order: 1,
        chapter_title: "1",
        image_index: block.id,
        image_id: block.id,
        image_url: imageUrl,
        storage_path: imageUrl,
        public_url: block.publicUrl,
        alt: block.altText || source,
        caption,
        source_path: source,
        local_path: "",
      };

      return row;
    });
}

export function buildBookProject(input: BookProjectInput): ProjectBuildResult {
  const errors: Record<string, string> = {};
  const title = input.title.trim();
  const author = input.author.trim();
  const legacyRawText = normalizeLineBreaks(input.rawText);
  const contentBlocks = normalizeContentBlocks(
    input.contentBlocks?.length ? input.contentBlocks : contentBlocksFromLegacy(legacyRawText, input.images),
  );
  const rawText = contentBlocksToRawText(contentBlocks);

  const pendingImage = flattenContentBlocks(contentBlocks).find(
    (block) => block.type === "image" && block.uploadState === "pending",
  );
  if (pendingImage) {
    errors.rawText = "画像の読み込みが完了してから保存してください。";
  }
  const failedImage = flattenContentBlocks(contentBlocks).find(
    (block): block is Extract<BookContentBlock, { type: "image" }> => block.type === "image" && block.uploadState === "error",
  );
  if (failedImage) {
    errors.rawText = failedImage.errorMessage || "画像の読み込みに失敗しました。";
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors };

  const now = new Date().toISOString();
  const bookId = stableBookId(title, author, input.existingBookId);
  // Keep the visible author name unchanged while ensuring the internal handle
  // satisfies Supabase's ASCII 2–40 character constraint.
  const authorHandle = normalizeAuthorHandle(input.authorHandle || author, author);
  const snsLinks: ExternalLink[] = [
    input.authorWebsiteUrl
      ? {
          id: "author-website",
          type: "website",
          label: "ホームページ",
          url: safeExternalUrl(input.authorWebsiteUrl),
        }
      : null,
    input.authorXUrl
      ? {
          id: "author-x",
          type: "other",
          label: "X",
          url: safeExternalUrl(input.authorXUrl),
        }
      : null,
    input.authorNoteUrl
      ? {
          id: "author-note",
          type: "note",
          label: "note",
          url: safeExternalUrl(input.authorNoteUrl),
        }
      : null,
  ].filter((link): link is ExternalLink => Boolean(link?.url));
  const externalLinks = [
    ...(input.externalLinks ?? []),
    input.externalSalesUrl
      ? {
          id: "external-sales",
          type: "other",
          label: input.externalSalesLabel?.trim() || "外部販売ページ",
          url: safeExternalUrl(input.externalSalesUrl),
        }
      : null,
  ].filter((link): link is ExternalLink => Boolean(link?.url));
  const chapters = extractChaptersFromText(rawText, title, contentBlocks);
  const imageRows = input.contentBlocks?.length
    ? imageRowsFromBlocks(contentBlocks, input.images)
    : buildImageRows(input.images);
  const availableImageIds = new Set(imageRows.map((image) => image.image_id || image.image_index));
  const missingImageIds = [...new Set(findImageReferenceIds(rawText))].filter(
    (id) => !availableImageIds.has(id),
  );

  if (missingImageIds.length > 0) {
    console.warn("Missing image IDs:", missingImageIds);
  }

  return {
    ok: true,
    project: {
      version: BOOK_PROJECT_VERSION,
      config: {
        bookId,
        publicationRevision: Number.isInteger(input.publicationRevision) && (input.publicationRevision || 0) > 0 ? input.publicationRevision : 1,
        slug: input.slug?.trim() || undefined,
        publication: {
          status: input.publicationStatus || "draft",
          visibility: input.publicationVisibility || "private",
        },
        title,
        subtitle: input.subtitle.trim(),
        author,
        description: input.description.trim(),
        language: normalizeLocale(input.language),
        coverImage: input.coverImage,
        bindingDirection: input.bindingDirection,
        theme: input.theme,
        themeSettings: input.themeSettings,
        coverDesign: normalizeCoverDesign(input.coverDesign),
        pageAdjustments: normalizePageAdjustments(input.pageAdjustments),
        tableOfContentsItemsPerPage: Math.max(1, input.tableOfContentsItemsPerPage),
        charactersPerPage: Math.max(180, input.charactersPerPage),
        publisherName: input.publisherName.trim() || "WebBookMaker",
        publishedAt: input.publishedAt.trim() || String(new Date().getFullYear()),
        copyrightText: input.copyrightText.trim() || (author ? `© ${author}` : ""),
        readerMode: "book",
        authorProfile: {
          handle: authorHandle,
          displayName: author,
          bio: input.authorBio?.trim() || "",
          websiteUrl: safeExternalUrl(input.authorWebsiteUrl || ""),
          snsLinks,
          updatedAt: now,
        },
        externalLinks,
        monetization: {
          ...DEFAULT_MONETIZATION,
          accessLevel: input.externalSalesUrl ? "external" : "free",
          externalSalesUrl: safeExternalUrl(input.externalSalesUrl || "") || undefined,
          externalSalesLabel: input.externalSalesLabel?.trim() || undefined,
        },
        analyticsSummary: {
          views: 0,
          shares: 0,
          completions: 0,
          completionRate: 0,
          popularChapters: [],
          updatedAt: now,
        },
        versions: [
          {
            id: "v1",
            label: "初版",
            note: "WebBookMakerで作成",
            createdAt: now,
          },
        ],
        branding: DEFAULT_BRANDING,
      },
      chapters,
      rawText,
      contentBlocks,
      images: imageRows,
      missingImageIds,
      createdAt: input.existingCreatedAt || now,
      updatedAt: now,
    },
  };
}

export function isBookProject(value: unknown): value is BookProject {
  if (typeof value !== "object" || value === null) return false;
  const project = value as BookProject;
  return (
    project.version === BOOK_PROJECT_VERSION &&
    typeof project.rawText === "string" &&
    Array.isArray(project.chapters) &&
    Array.isArray(project.images) &&
    typeof project.createdAt === "string" &&
    typeof project.updatedAt === "string" &&
    typeof project.config?.bookId === "string" &&
    typeof project.config?.title === "string" &&
    typeof project.config?.author === "string"
  );
}
