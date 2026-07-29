import type { BindingDirection } from "@/config/bookConfig";
import type { ImageManifestRow, NovelChapter, ReaderPage } from "./types";

const IMAGE_PATTERN = /^\[\[image:([A-Za-z0-9._-]+)(?:\|([^\]]*))?\]\]$/;

function splitLongParagraph(paragraph: string, limit: number) {
  const chunks: string[] = [];
  let remainder = paragraph;

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
    chunks.push(remainder.slice(0, cut).trim());
    remainder = remainder.slice(cut).trim();
  }

  if (remainder) chunks.push(remainder);
  return chunks;
}

function textCost(paragraph: string) {
  const headingCost = paragraph.startsWith("## ") ? 44 : 0;
  return paragraph.length + (paragraph.match(/\n/g)?.length ?? 0) * 18 + 22 + headingCost;
}

function imageSource(image?: ImageManifestRow) {
  if (!image) return undefined;
  if (image.image_url.startsWith("data:") || image.image_url.startsWith("blob:")) {
    return image.image_url;
  }
  if (image.image_url.startsWith("/")) return image.image_url;
  if (image.local_path) return `/${image.local_path.replaceAll("\\", "/")}`;
  return undefined;
}

export function buildReaderPages({
  chapters,
  images,
  charactersPerPage,
  tableOfContentsItemsPerPage,
}: {
  chapters: NovelChapter[];
  images: ImageManifestRow[];
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
      .replace(/^(\[\[image:[A-Za-z0-9._-]+(?:\|[^\]]*)?\]\])$/gm, "\n\n$1\n\n")
      .split(/\n{2,}/)
      .map((segment) => segment.trim());
    let paragraphs: string[] = [];
    let cost = 0;
    let textPageIndex = 1;

    const flushTextPage = () => {
      if (!paragraphs.length) return;
      pages.push({
        id: `${chapter.slug}-text-${textPageIndex}`,
        kind: "text",
        chapterTitle: chapter.title,
        paragraphs,
      });
      textPageIndex += 1;
      paragraphs = [];
      cost = 0;
    };

    for (const segment of segments) {
      if (!segment) continue;
      const imageMatch = segment.match(IMAGE_PATTERN);
      if (imageMatch) {
        flushTextPage();
        const imageId = imageMatch[1];
        const image = imageMap.get(imageId) ?? imageMap.get(`${chapter.order}-${imageId}`);
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
        });
        continue;
      }

      for (const chunk of splitLongParagraph(segment, Math.floor(charactersPerPage * 0.86))) {
        const chunkCost = textCost(chunk);
        const startsWithHeading = chunk.startsWith("## ");
        if (paragraphs.length && cost + chunkCost > charactersPerPage) flushTextPage();
        if (startsWithHeading && paragraphs.length && cost > charactersPerPage * 0.72) {
          flushTextPage();
        }
        paragraphs.push(chunk);
        cost += chunkCost;
      }
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
