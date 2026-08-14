import type { BindingDirection } from "@/config/bookConfig";
import { normalizeMediaDisplaySize, type BookContentBlock, type MediaDisplaySize } from "./bookProject";
import type { ImageManifestRow, NovelChapter, ReaderPage } from "./types";
import { findPageAdjustment, type PageAdjustment } from "./pageAdjustments";
import { sliceTextMarks, type TextMark } from "./textStyles";

const IMAGE_PATTERN = /^\[\[image:([A-Za-z0-9._-]+)(?:\|([^\]|]*))?(?:\|(inline|full-page))?(?:\|(small|medium|large|full))?\]\]$/;
const YOUTUBE_PATTERN = /^\[\[youtube:([A-Za-z0-9._-]+)(?:\|([A-Za-z0-9_-]{11}))?(?:\|(inline|full-page))?(?:\|(small|medium|large|full))?\]\]$/;
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

export function buildReaderPages({
  chapters,
  images,
  contentBlocks,
  pageAdjustments,
  charactersPerPage,
  tableOfContentsItemsPerPage,
}: {
  chapters: NovelChapter[];
  images: ImageManifestRow[];
  contentBlocks?: BookContentBlock[];
  pageAdjustments?: PageAdjustment[];
  charactersPerPage: number;
  tableOfContentsItemsPerPage: number;
}): ReaderPage[] {
  const pages: ReaderPage[] = [
    { id: "cover", kind: "cover" },
    { id: "title", kind: "title" },
  ];
  const contentsPerPage = Math.max(1, tableOfContentsItemsPerPage);
  const totalContentsPages = Math.ceil(chapters.length / contentsPerPage);

  for (let part = 0; part < totalContentsPages; part += 1) {
    const chapterStart = part * contentsPerPage;
    pages.push({
      id: `contents-${part + 1}`,
      kind: "contents",
      chapterStart,
      chapterEnd: Math.min(chapterStart + contentsPerPage, chapters.length),
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

  for (const chapter of chapters) {
    pages.push({
      id: `chapter-${chapter.slug}`,
      kind: "chapterTitle",
      chapterOrder: chapter.order,
      chapterTitle: chapter.title,
      chapterSlug: chapter.slug,
    });

    const segments = chapter.body
      .replace(/^(\[\[(?:image|youtube):[^\]]+\]\])$/gm, "\n\n$1\n\n")
      .split(/\n{2,}/)
      .map((segment) => segment.trim());
    let paragraphs: string[] = [];
    let paragraphRuns: TextMark[][] = [];
    let paragraphSourceBlockIds: string[] = [];
    let cost = 0;
    let textPageIndex = 1;

    const textBlocks = (contentBlocks || []).filter(
      (block): block is Extract<BookContentBlock, { type: "text" }> => block.type === "text",
    );
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
        paragraphs,
        paragraphRuns,
        sourceBlockIds: sourceBlockIdsFor(pageId, paragraphs),
      });
      textPageIndex += 1;
      paragraphs = [];
      paragraphRuns = [];
      paragraphSourceBlockIds = [];
      cost = 0;
    };

    for (const entry of segmentEntries) {
      const { segment } = entry;
      if (!segment) continue;
      const youtubeMatch = segment.match(YOUTUBE_PATTERN);
      if (youtubeMatch) {
        const storedBlockId = youtubeMatch[1];
        const videoId = youtubeMatch[2] || storedBlockId;
        const youtubeBlock = (contentBlocks || []).find(
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
          continue;
        }
        flushTextPage();
        pages.push({
          id: `${chapter.slug}-youtube-${sourceId}`,
          kind: "youtube",
          chapterTitle: chapter.title,
          videoId,
          originalUrl: youtubeBlock?.originalUrl || `https://www.youtube.com/watch?v=${videoId}`,
          displaySize,
          sourceBlockIds: [sourceId],
        });
        if (adjustmentForSource(sourceId)?.pageBreakAfter) handledBreakAfter.add(sourceId);
        continue;
      }
      const imageMatch = segment.match(IMAGE_PATTERN);
      if (imageMatch) {
        const imageId = imageMatch[1];
        const image = imageMap.get(imageId) ?? imageMap.get(`${chapter.order}-${imageId}`);
        const pageMode = imageMatch[3] === "inline" ? "inline" : "full-page";
        const imageBlock = (contentBlocks || []).find(
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
          continue;
        }

        flushTextPage();
        pages.push({
          id: `${chapter.slug}-image-${imageId}`,
          kind: "image",
          chapterTitle: chapter.title,
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
    }

    flushTextPage();
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

export const toRightBoundPageOrder = toBoundPageOrder;
