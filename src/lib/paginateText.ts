import type { BindingDirection } from "@/config/bookConfig";
import { flattenContentBlocks, normalizeMediaDisplaySize, normalizePaywallAnchors, type BookColumnChildBlock, type BookContentBlock, type BookColumnsBlock, type MediaDisplaySize } from "./bookProject";
import type { ImageManifestRow, NovelChapter, ReaderColumnChild, ReaderPage } from "./types";
import { findPageAdjustment, type PageAdjustment } from "./pageAdjustments";
import { sliceTextMarks, type TextMark } from "./textStyles";
import { parseDocumentHeading } from "./documentStructure";

const IMAGE_PATTERN = /^\[\[image:([A-Za-z0-9._-]+)(?:\|([^\]|]*))?(?:\|(inline|full-page))?(?:\|(small|medium|large|full))?\]\]$/;
const YOUTUBE_PATTERN = /^\[\[youtube:([A-Za-z0-9._-]+)(?:\|([A-Za-z0-9_-]{11}))?(?:\|(inline|full-page))?(?:\|(small|medium|large|full))?\]\]$/;
const COLUMNS_PATTERN = /^\[\[columns:([A-Za-z0-9._-]+)\]\]$/;
export const INLINE_IMAGE_TOKEN_PREFIX = "[[inline-image:";
export const INLINE_YOUTUBE_TOKEN_PREFIX = "[[inline-youtube:";

export function createInlineImageToken(payload: {
  src?: string;
  alt: string;
  caption: string;
  missing?: boolean;
  displaySize?: MediaDisplaySize;
}) {
  return `${INLINE_IMAGE_TOKEN_PREFIX}${encodeURIComponent(JSON.stringify(payload))}]]`;
}

export function createInlineYouTubeToken(payload: {
  videoId: string;
  originalUrl: string;
  displaySize?: MediaDisplaySize;
}) {
  return `${INLINE_YOUTUBE_TOKEN_PREFIX}${encodeURIComponent(JSON.stringify(payload))}]]`;
}

function mediaCost(charactersPerPage: number, displaySize: MediaDisplaySize) {
  const ratio = displaySize === "small" ? 0.28 : displaySize === "large" ? 0.54 : displaySize === "full" ? 0.68 : 0.42;
  return Math.max(64, Math.floor(charactersPerPage * ratio));
}

function splitLongParagraph(paragraph: string, limit: number) {
  const chunks: Array<{ text: string; start: number; end: number }> = [];
  let remainder = paragraph;
  let offset = 0;

  while (remainder.length > limit) {
    const minimum = Math.floor(limit * 0.64);
    let cut = -1;
    for (let index = limit; index >= minimum; index -= 1) {
      if ("、。！？\n」』）) ".includes(remainder[index] ?? "")) {
        cut = index + 1;
        break;
      }
    }
    if (cut === -1) cut = limit;
    const raw = remainder.slice(0, cut);
    const text = raw.trim();
    const trimStart = raw.length - raw.trimStart().length;
    chunks.push({ text, start: offset + trimStart, end: offset + trimStart + text.length });
    const nextRemainder = remainder.slice(cut);
    const leadingTrim = nextRemainder.length - nextRemainder.trimStart().length;
    remainder = nextRemainder.trimStart();
    offset += cut + leadingTrim;
  }

  if (remainder) {
    const start = paragraph.length - remainder.length;
    chunks.push({ text: remainder, start, end: start + remainder.length });
  }
  return chunks;
}

function textCost(paragraph: string) {
  const headingCost = paragraph.startsWith("## ") ? 44 : 0;
  return paragraph.length + (paragraph.match(/\n/g)?.length ?? 0) * 18 + 22 + headingCost;
}

function lineBreakOnlyOverride(original: string, override: string) {
  return original.replace(/\r\n?/g, "\n").replace(/\n/g, "") === override.replace(/\r\n?/g, "\n").replace(/\n/g, "");
}

function imageSource(image?: ImageManifestRow) {
  if (!image) return undefined;
  const displayUrl = image.public_url || image.image_url || image.storage_path || "";
  if (displayUrl.startsWith("data:") || displayUrl.startsWith("blob:")) {
    return displayUrl;
  }
  if (displayUrl.startsWith("/") || /^https?:\/\//i.test(displayUrl)) return displayUrl;
  if (image.local_path) return `/${image.local_path.replaceAll("\\", "/")}`;
  return undefined;
}

function normalizeHeadingTitle(value: string) {
  return value.normalize("NFKC").replace(/\s+/gu, " ").trim();
}

/** Serialize a top-level block for pagination while keeping Columns atomic. */
function blockSerialization(block: BookContentBlock): string {
  if (block.type === "columns") return `[[columns:${block.id}]]`;
  if (block.type === "text") return block.content;
  if (block.type === "youtube") {
    const mode = block.displayMode === "inline" ? "inline" : "full-page";
    return `[[youtube:${block.id}|${block.videoId}|${mode}|${normalizeMediaDisplaySize(block.displaySize)}]]`;
  }
  if (block.type === "paywall") return "";
  const mode = block.pageMode === "inline" ? "inline" : "full-page";
  const caption = block.caption?.trim();
  return caption
    ? `[[image:${block.id}|${caption}|${mode}|${normalizeMediaDisplaySize(block.displaySize)}]]`
    : `[[image:${block.id}||${mode}|${normalizeMediaDisplaySize(block.displaySize)}]]`;
}

function chapterBlockRanges(blocks: BookContentBlock[]) {
  const headings = blocks
    .map((block, index) => (block.type === "text" && block.structureRole === "chapter" ? index : -1))
    .filter((index) => index >= 0);
  if (!headings.length) return [{ start: 0, end: blocks.length, headingIndex: -1 }];
  return headings.map((headingIndex, index) => ({
    // Keep the range start at the heading itself. The first chapter may have
    // preface blocks before its heading; chapterBodies adds those explicitly.
    start: headingIndex,
    end: headings[index + 1] ?? blocks.length,
    headingIndex,
  }));
}

function resolveColumnChild(child: BookColumnChildBlock, imageMap: Map<string, ImageManifestRow>): ReaderColumnChild {
  if (child.type === "text") {
    return { id: child.id, kind: "text", paragraphs: [child.content], paragraphRuns: [child.marks || []] };
  }
  if (child.type === "youtube") {
    return { id: child.id, kind: "youtube", videoId: child.videoId, originalUrl: child.originalUrl, displaySize: normalizeMediaDisplaySize(child.displaySize) };
  }
  const image = imageMap.get(child.id);
  return {
    id: child.id,
    kind: "image",
    src: child.publicUrl || imageSource(image) || child.storagePath || undefined,
    alt: child.altText || child.fileName || "本文画像",
    caption: child.caption || image?.caption || "",
    missing: !child.storagePath && !child.publicUrl && !image,
    displaySize: normalizeMediaDisplaySize(child.displaySize),
  };
}

function columnsPageFor(block: BookColumnsBlock, chapter: NovelChapter, imageMap: Map<string, ImageManifestRow>, sectionTitle?: string, headingId?: string): ReaderPage {
  return {
    id: `${chapter.slug}-columns-${block.id}`,
    kind: "columns",
    chapterTitle: chapter.title,
    sectionTitle,
    headingId,
    ratio: block.ratio,
    columnsBlockId: block.id,
    left: block.left.blocks.map((child) => resolveColumnChild(child, imageMap)),
    right: block.right.blocks.map((child) => resolveColumnChild(child, imageMap)),
    sourceBlockIds: [block.id, ...block.left.blocks.map((child) => child.id), ...block.right.blocks.map((child) => child.id)],
  };
}

export function buildReaderPages({
  chapters,
  images,
  contentBlocks,
  pageAdjustments,
  charactersPerPage,
  tableOfContentsItemsPerPage,
  includePaywallPage = false,
  showPaywallPage = false,
  tocEntryCountOverride,
}: {
  chapters: NovelChapter[];
  images: ImageManifestRow[];
  contentBlocks?: BookContentBlock[];
  pageAdjustments?: PageAdjustment[];
  charactersPerPage: number;
  tableOfContentsItemsPerPage: number;
  includePaywallPage?: boolean;
  /** Render the boundary in an author Preview while keeping later content. */
  showPaywallPage?: boolean;
  tocEntryCountOverride?: number;
}): ReaderPage[] {
  const pages: ReaderPage[] = [
    { id: "cover", kind: "cover" },
    { id: "title", kind: "title" },
  ];
  const contentsPerPage = Math.max(1, tableOfContentsItemsPerPage);
  const chapterTocEntryCount = chapters.reduce(
    (count, chapter) => count + 1 + (chapter.sections?.filter((section) => section.level === 2).length || 0),
    0,
  );
  const tocEntryCount = tocEntryCountOverride ?? chapterTocEntryCount;
  const totalContentsPages = Math.ceil(tocEntryCount / contentsPerPage);

  for (let part = 0; part < totalContentsPages; part += 1) {
    const chapterStart = part * contentsPerPage;
    pages.push({
      id: `contents-${part + 1}`,
      kind: "contents",
      chapterStart,
      chapterEnd: Math.min(chapterStart + contentsPerPage, tocEntryCount),
      tocEntryStart: chapterStart,
      tocEntryEnd: Math.min(chapterStart + contentsPerPage, tocEntryCount),
      part: part + 1,
      totalParts: totalContentsPages,
    });
  }

  const imageMap = new Map<string, ImageManifestRow>();
  for (const image of images) {
    if (image.image_id) imageMap.set(image.image_id, image);
    imageMap.set(image.image_index, image);
    imageMap.set(`${image.chapter_order}-${image.image_index}`, image);
  }

  // Paywall placement is defined by the ordered contentBlocks sequence, not
  // by a chapter/page number. The chapter bodies intentionally omit the
  // Paywall block from rawText, so resolve the nearest renderable neighbours
  // here and insert the marker while the anchored block is being paginated.
  // Keep the top-level order intact so a ColumnsBlock can become one atomic
  // ReaderPage. A flattened view is still used for media lookup and legacy
  // callers, but it is never used to emit the Columns children as pages.
  const orderedContentBlocks = contentBlocks ? normalizePaywallAnchors(contentBlocks) : [];
  const normalizedContentBlocks = flattenContentBlocks(orderedContentBlocks);
  const flatContentBlocks = normalizedContentBlocks;
  const paywallIndex = normalizedContentBlocks.findIndex((block) => block.type === "paywall");
  const paywall = paywallIndex >= 0 ? normalizedContentBlocks[paywallIndex] : undefined;
  const paywallPreviousBlockId = paywall?.type === "paywall" ? paywall.previousBlockId : undefined;
  const paywallNextBlockId = paywall?.type === "paywall" ? paywall.nextBlockId : undefined;
  let paywallInserted = false;
  const structuredChapterBlocks = normalizedContentBlocks.filter(
    (block): block is Extract<BookContentBlock, { type: "text" }> => block.type === "text" && block.structureRole === "chapter",
  );
  const textBlocks = normalizedContentBlocks.filter(
    (block): block is Extract<BookContentBlock, { type: "text" }> => block.type === "text",
  );
  const chapterHeadingSourceId = (chapter: NovelChapter) => {
    const structured = structuredChapterBlocks.find((block) => normalizeHeadingTitle(block.content) === normalizeHeadingTitle(chapter.title));
    if (structured) return structured.id;
    const parsed = textBlocks.find((block) => {
      const heading = parseDocumentHeading(block.content.split("\n", 1)[0] || "");
      return heading?.level === 1 && normalizeHeadingTitle(heading.title) === normalizeHeadingTitle(chapter.title);
    });
    return parsed?.id;
  };
  const insertPaywallPage = () => {
    if (paywallInserted || paywall?.type !== "paywall") return;
    pages.push({ id: `paywall-${paywall.id}`, kind: "paywall", sourceBlockId: paywall.id });
    paywallInserted = true;
  };

  // extractChaptersFromText historically flattens Columns into chapter.body.
  // Rebuild a pagination-only body with an atomic Columns token so the stored
  // document remains backwards compatible while the Reader receives the real
  // two-pane page.
  const chapterBodies = new Map<string, string>();
  const chapterRanges = chapterBlockRanges(orderedContentBlocks);
  // Only rebuild chapter bodies when the canonical block sequence contains
  // explicit chapter blocks. Plain-text paste keeps all chapters in one text
  // block; in that case chapterRanges has a single catch-all range and
  // reusing it for every parsed chapter duplicates the entire manuscript
  // once per chapter (the Mini Preview then appears to start a second cycle).
  const canRebuildChapterBodies = orderedContentBlocks.length > 0 && (
    // A single fallback chapter can safely consume the complete block list
    // (including Columns/media tokens) even when its heading is not marked
    // structurally.
    chapters.length === 1
    || (structuredChapterBlocks.length > 0 && chapterRanges.length === chapters.length)
  );
  if (canRebuildChapterBodies) {
    chapters.forEach((chapter, chapterIndex) => {
      const range = chapterRanges[chapterIndex];
      if (!range) return;
      // Preserve any preface blocks before the first chapter heading, while
      // excluding each chapter's own H1 from the body. This keeps the formal
      // Columns token ordering identical to the canonical document.
      const prefixBlocks = chapterIndex === 0 && range.headingIndex > 0
        ? orderedContentBlocks.slice(0, range.headingIndex)
        : [];
      const bodyStart = range.headingIndex >= 0 ? range.headingIndex + 1 : range.start;
      const bodyBlocks = [...prefixBlocks, ...orderedContentBlocks.slice(bodyStart, range.end)];
      const body = bodyBlocks.map(blockSerialization).filter(Boolean).join("\n\n").trim();
      chapterBodies.set(chapter.slug, body);
    });
  }

  for (const chapter of chapters) {
    const chapterHeadingId = chapterHeadingSourceId(chapter);
    // A boundary before the first block (or before a chapter heading whose
    // previous block was not rendered) must still remain before that heading.
    if (!paywallInserted && paywallNextBlockId && paywallNextBlockId === chapterHeadingId) {
      insertPaywallPage();
    }
    pages.push({
      id: `chapter-${chapter.slug}`,
      kind: "chapterTitle",
      chapterOrder: chapter.order,
      chapterTitle: chapter.title,
      chapterSlug: chapter.slug,
      headingId: chapter.id,
      sourceBlockIds: chapterHeadingId ? [chapterHeadingId] : undefined,
    });
    // A Paywall immediately after an H1 belongs after the chapter title page,
    // never at the start of the chapter's preceding content.
    if (!paywallInserted && paywallPreviousBlockId === chapterHeadingId) {
      insertPaywallPage();
    }

    const chapterBody = chapterBodies.get(chapter.slug) ?? chapter.body;
    const segments = chapterBody
      .replace(/^(\[\[(?:image|youtube|columns):[^\]]+\]\])$/gm, "\n\n$1\n\n")
      .split(/\n{2,}/)
      .map((segment) => segment.trim());
    let paragraphs: string[] = [];
    let paragraphRuns: TextMark[][] = [];
    let paragraphSourceBlockIds: string[] = [];
    let cost = 0;
    let textPageIndex = 1;
    let currentSectionTitle: string | undefined;
    let currentSectionId: string | undefined;
    let pendingHeadingId: string | undefined;

    const textSourceFor = (segment: string) =>
      textBlocks.find((block) => block.content.includes(segment));
    const segmentEntries = segments.map((segment, index) => ({
      segment,
      index,
      source: textSourceFor(segment),
    }));
    const lastSegmentIndexBySource = new Map<string, number>();
    for (const entry of segmentEntries) {
      if (entry.source) lastSegmentIndexBySource.set(entry.source.id, entry.index);
    }
    const handledBreakBefore = new Set<string>();
    const handledBreakAfter = new Set<string>();
    const adjustmentForSource = (sourceId: string | undefined) =>
      sourceId ? findPageAdjustment(pageAdjustments, sourceId) : undefined;
    const shouldBreakBefore = (sourceId: string | undefined) => {
      if (!sourceId || handledBreakBefore.has(sourceId)) return false;
      const adjustment = adjustmentForSource(sourceId);
      if (!adjustment?.pageBreakBefore) return false;
      handledBreakBefore.add(sourceId);
      return true;
    };
    const shouldBreakAfter = (sourceId: string | undefined, segmentIndex: number) => {
      if (!sourceId || handledBreakAfter.has(sourceId)) return false;
      if (lastSegmentIndexBySource.get(sourceId) !== segmentIndex) return false;
      const adjustment = adjustmentForSource(sourceId);
      if (!adjustment?.pageBreakAfter) return false;
      handledBreakAfter.add(sourceId);
      return true;
    };
    const paragraphOverrideFor = (segment: string) => {
      const source = textSourceFor(segment);
      if (!source) return { text: segment, sourceId: undefined };
      const override = findPageAdjustment(pageAdjustments, source.id)?.displayTextOverride;
      if (typeof override !== "string" || !lineBreakOnlyOverride(source.content, override)) {
        return { text: segment, sourceId: source.id, marks: source.marks };
      }
      return { text: override, sourceId: source.id, marks: source.marks };
    };
    const sourceBlockIdsFor = (pageId: string, pageParagraphs: string[]) => {
      const sourceIds = new Set<string>();
      for (const sourceId of paragraphSourceBlockIds) sourceIds.add(sourceId);
      for (const paragraph of pageParagraphs) {
        const normalized = paragraph.trim();
        if (!normalized) continue;
        const source = textBlocks.find((block) => block.content.includes(normalized));
        if (source) sourceIds.add(source.id);
      }
      // Keep the rendered page id as a stable, page-specific fallback. This
      // preserves existing adjustments for legacy projects while exposing the
      // underlying content block ids when they are available.
      sourceIds.add(pageId);
      return [...sourceIds];
    };

    const flushTextPage = () => {
      if (!paragraphs.length) return;
      const pageId = `${chapter.slug}-text-${textPageIndex}`;
      pages.push({
        id: pageId,
        kind: "text",
        chapterTitle: chapter.title,
        sectionTitle: currentSectionTitle,
        headingId: pendingHeadingId,
        paragraphs,
        paragraphRuns,
        sourceBlockIds: sourceBlockIdsFor(pageId, paragraphs),
      });
      textPageIndex += 1;
      paragraphs = [];
      paragraphRuns = [];
      paragraphSourceBlockIds = [];
      cost = 0;
      pendingHeadingId = undefined;
    };

    for (const entry of segmentEntries) {
      const { segment } = entry;
      if (!segment) continue;
      const entrySourceId = entry.source?.id;
      if (!paywallInserted && paywallNextBlockId && entrySourceId === paywallNextBlockId) {
        flushTextPage();
        insertPaywallPage();
      }
      const heading = parseDocumentHeading(segment.split("\n", 1)[0]);
      if (heading && (heading.level === 2 || heading.level === 3)) {
        if (paragraphs.length) flushTextPage();
        currentSectionTitle = heading.title;
        currentSectionId = chapter.sections?.find(
          (section) => section.title === heading.title && section.level === heading.level,
        )?.id;
        pendingHeadingId = currentSectionId;
      }
      const columnsMatch = segment.match(COLUMNS_PATTERN);
      if (columnsMatch) {
        const columnsBlock = orderedContentBlocks.find(
          (block): block is BookColumnsBlock => block.type === "columns" && block.id === columnsMatch[1],
        );
        if (columnsBlock) {
          if (shouldBreakBefore(columnsBlock.id)) flushTextPage();
          flushTextPage();
          pages.push(columnsPageFor(columnsBlock, chapter, imageMap, currentSectionTitle, pendingHeadingId));
          if (adjustmentForSource(columnsBlock.id)?.pageBreakAfter) handledBreakAfter.add(columnsBlock.id);
          pendingHeadingId = undefined;
          if (!paywallInserted && paywallPreviousBlockId === columnsBlock.id) insertPaywallPage();
          continue;
        }
      }
      const youtubeMatch = segment.match(YOUTUBE_PATTERN);
      if (youtubeMatch) {
        const storedBlockId = youtubeMatch[1];
        const videoId = youtubeMatch[2] || storedBlockId;
        const youtubeBlock = flatContentBlocks.find(
          (block): block is Extract<BookContentBlock, { type: "youtube" }> =>
            block.type === "youtube" && (youtubeMatch[2] ? block.id === storedBlockId : block.videoId === videoId),
        );
        const sourceId = youtubeBlock?.id || `youtube-${videoId}`;
        const displayMode = youtubeBlock?.displayMode === "inline" || youtubeMatch[3] === "inline" ? "inline" : "full-page";
        const displaySize = normalizeMediaDisplaySize(youtubeBlock?.displaySize || youtubeMatch[4]);
        if (shouldBreakBefore(sourceId)) flushTextPage();
        if (displayMode === "inline") {
          const inlineCost = mediaCost(charactersPerPage, displaySize);
          if (paragraphs.length && cost + inlineCost > charactersPerPage) flushTextPage();
          paragraphs.push(createInlineYouTubeToken({
            videoId,
            originalUrl: youtubeBlock?.originalUrl || `https://www.youtube.com/watch?v=${videoId}`,
            displaySize,
          }));
          paragraphSourceBlockIds.push(sourceId);
          cost += inlineCost;
          if (adjustmentForSource(sourceId)?.pageBreakAfter) {
            handledBreakAfter.add(sourceId);
            flushTextPage();
          }
          if (!paywallInserted && paywallPreviousBlockId === sourceId) {
            flushTextPage();
            insertPaywallPage();
          }
          continue;
        }
        flushTextPage();
        pages.push({
          id: `${chapter.slug}-youtube-${sourceId}`,
          kind: "youtube",
          chapterTitle: chapter.title,
          sectionTitle: currentSectionTitle,
          headingId: pendingHeadingId,
          videoId,
          originalUrl: youtubeBlock?.originalUrl || `https://www.youtube.com/watch?v=${videoId}`,
          displaySize,
          sourceBlockIds: [sourceId],
        });
        if (adjustmentForSource(sourceId)?.pageBreakAfter) handledBreakAfter.add(sourceId);
        pendingHeadingId = undefined;
        if (!paywallInserted && paywallPreviousBlockId === sourceId) insertPaywallPage();
        continue;
      }
      const imageMatch = segment.match(IMAGE_PATTERN);
      if (imageMatch) {
        const imageId = imageMatch[1];
        const image = imageMap.get(imageId) ?? imageMap.get(`${chapter.order}-${imageId}`);
        const pageMode = imageMatch[3] === "inline" ? "inline" : "full-page";
        const imageBlock = flatContentBlocks.find(
          (block): block is Extract<BookContentBlock, { type: "image" }> => block.type === "image" && block.id === imageId,
        );
        const displaySize = normalizeMediaDisplaySize(imageBlock?.displaySize || imageMatch[4]);
        const imageSourceId = image?.image_id || image?.image_index || imageId;
        const imageAdjustment = findPageAdjustment(pageAdjustments, imageSourceId);
        if (shouldBreakBefore(imageSourceId)) flushTextPage();
        if (pageMode === "inline") {
          const inlineImageCost = mediaCost(charactersPerPage, displaySize);
          if (paragraphs.length && cost + inlineImageCost > charactersPerPage) {
            flushTextPage();
          }
          paragraphs.push(
            createInlineImageToken({
              src: imageSource(image),
              alt: image?.alt || `${chapter.title} image ${imageId}`,
              caption: image?.caption || imageMatch[2] || "",
              missing: !image,
              displaySize,
            }),
          );
          paragraphSourceBlockIds.push(image?.image_id || image?.image_index || imageId);
          cost += inlineImageCost;
          if (imageAdjustment?.pageBreakAfter) {
            handledBreakAfter.add(imageSourceId);
            flushTextPage();
          }
          if (!paywallInserted && paywallPreviousBlockId === imageSourceId) {
            flushTextPage();
            insertPaywallPage();
          }
          continue;
        }

        flushTextPage();
        pages.push({
          id: `${chapter.slug}-image-${imageId}`,
          kind: "image",
          chapterTitle: chapter.title,
          sectionTitle: currentSectionTitle,
          headingId: pendingHeadingId,
          imageIndex: image?.image_index || imageId,
          imageId,
          src: imageSource(image),
          alt: image?.alt || `${chapter.title} image ${imageId}`,
          caption: image?.caption || imageMatch[2] || "",
          missing: !image,
          displaySize,
          sourceBlockIds: [image?.image_id || image?.image_index || imageId, `${chapter.slug}-image-${imageId}`],
        });
        if (imageAdjustment?.pageBreakAfter) {
          handledBreakAfter.add(imageSourceId);
        }
        pendingHeadingId = undefined;
        if (!paywallInserted && paywallPreviousBlockId === imageSourceId) insertPaywallPage();
        continue;
      }

      const sourceId = entry.source?.id;
      if (shouldBreakBefore(sourceId)) flushTextPage();
      const displaySegment = paragraphOverrideFor(segment);
      if (!displaySegment.text) continue;
      if (displaySegment.sourceId) paragraphSourceBlockIds.push(displaySegment.sourceId);
      for (const chunk of splitLongParagraph(displaySegment.text, Math.floor(charactersPerPage * 0.86))) {
        const chunkCost = textCost(chunk.text);
        const startsWithHeading = chunk.text.startsWith("## ");
        if (paragraphs.length && cost + chunkCost > charactersPerPage) flushTextPage();
        if (startsWithHeading && paragraphs.length && cost > charactersPerPage * 0.72) {
          flushTextPage();
        }
        paragraphs.push(chunk.text);
        paragraphRuns.push(sliceTextMarks(displaySegment.marks, chunk.start, chunk.end));
        cost += chunkCost;
      }
      if (shouldBreakAfter(sourceId, entry.index)) flushTextPage();
      if (
        !paywallInserted &&
        sourceId &&
        paywallPreviousBlockId === sourceId &&
        lastSegmentIndexBySource.get(sourceId) === entry.index
      ) {
        flushTextPage();
        insertPaywallPage();
      }
    }

    flushTextPage();
  }

  if (includePaywallPage && paywall?.type === "paywall") {
    insertPaywallPage();
    return pages;
  }

  if (showPaywallPage && paywall?.type === "paywall" && !paywallInserted) {
    const previousBlockId = paywallPreviousBlockId;
    const targetIndex = previousBlockId
      ? pages.findIndex((page) => "sourceBlockIds" in page && page.sourceBlockIds?.includes(previousBlockId))
      : -1;
    const firstChapterIndex = pages.findIndex((page) => page.kind === "chapterTitle");
    const insertAt = targetIndex >= 0 ? targetIndex + 1 : firstChapterIndex >= 0 ? firstChapterIndex : pages.length;
    pages.splice(insertAt, 0, { id: `paywall-${paywall.id}`, kind: "paywall", sourceBlockId: paywall.id });
  }

  pages.push({ id: "colophon", kind: "colophon" });
  pages.push({ id: "back-cover", kind: "backCover" });
  return pages;
}

export function toBoundPageOrder(
  pages: ReaderPage[],
  isMobile: boolean,
  bindingDirection: BindingDirection,
) {
  void bindingDirection;
  return isMobile ? pages : [...pages];
}

/**
 * Keep the Mini Preview source list as one deterministic page set. Reader page
 * ids are the identity boundary; a stale append or accidental duplicate page
 * must not produce a second preview cycle.
 */
export function uniqueReaderPages(pages: ReaderPage[]): ReaderPage[] {
  const seen = new Set<string>();
  return pages.filter((page) => {
    if (seen.has(page.id)) return false;
    seen.add(page.id);
    return true;
  });
}

export const toRightBoundPageOrder = toBoundPageOrder;
