import { parseCsv } from "@/lib/parseCsv";
import type { ChapterManifestRow, ImageManifestRow, NovelChapter } from "@/lib/types";
import { findDocumentHeadings, parseDocumentStructure } from "@/lib/documentStructure";

type RawChapterManifestRow = Omit<ChapterManifestRow, "order"> & {
  order: string;
};

type RawImageManifestRow = Omit<ImageManifestRow, "chapter_order" | "image_index"> & {
  chapter_order: string;
  image_index: string;
};

export type ImportedBook = {
  chapters: NovelChapter[];
  images: ImageManifestRow[];
};

function slugFromTitle(title: string, order: number) {
  const slug = title
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^\p{Letter}\p{Number}]+/gu, "-")
    .replace(/^-+|-+$/g, "");
  return slug || `chapter-${String(order).padStart(2, "0")}`;
}

function normalizeTitle(value: string) {
  return value.normalize("NFKC").replace(/\s+/g, " ").trim();
}

function extractMarkdownChapters(source: string) {
  const text = source.replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n");
  const structure = parseDocumentStructure(text, "本文");
  const headings = findDocumentHeadings(text)
    .filter((heading) => heading.level === 1)
    .map((heading) => ({
      ...heading,
      index: text.split("\n").slice(0, heading.index).join("\n").length + (heading.index ? 1 : 0),
    }));

  if (!headings.length) {
    return [{ title: "本文", body: text.trim() }];
  }

  return headings.map((heading, index) => {
    const start = heading.index + heading.line.length;
    const end = headings[index + 1]?.index ?? text.length;
    return {
      title: heading.title.trim(),
      body: text.slice(start, end).trim(),
      sections: structure.chapters[index]?.sections || [],
    };
  });
}

export function parseChapterManifest(source: string): ChapterManifestRow[] {
  return parseCsv<RawChapterManifestRow>(source)
    .map((row, index) => ({
      order: Number(row.order || index + 1),
      id: row.id || `chapter-${String(index + 1).padStart(2, "0")}`,
      title: row.title,
      source: row.source || "book.txt",
      subtitle: row.subtitle || undefined,
    }))
    .sort((left, right) => left.order - right.order);
}

export function parseImageManifest(source: string): ImageManifestRow[] {
  return parseCsv<RawImageManifestRow>(source).map((image) => ({
    ...image,
    chapter_order: Number(image.chapter_order),
    image_index: image.image_index,
    image_id: image.image_index,
  }));
}

export function importBook({
  text,
  chapterManifestCsv,
  imageManifestCsv,
}: {
  text: string;
  chapterManifestCsv?: string;
  imageManifestCsv?: string;
}): ImportedBook {
  const detectedChapters = extractMarkdownChapters(text);
  const detectedByTitle = new Map(
    detectedChapters.map((chapter) => [normalizeTitle(chapter.title), chapter]),
  );
  const chapterManifest: ChapterManifestRow[] = chapterManifestCsv
    ? parseChapterManifest(chapterManifestCsv)
    : detectedChapters.map((chapter, index) => ({
        order: index + 1,
        id: `chapter-${String(index + 1).padStart(2, "0")}`,
        title: chapter.title,
        source: "book.txt",
        subtitle: undefined,
      }));

  return {
    chapters: chapterManifest.map((definition) => {
      const detected = detectedByTitle.get(normalizeTitle(definition.title));
      return {
        id: definition.id,
        order: definition.order,
        title: definition.title,
        slug: definition.id || slugFromTitle(definition.title, definition.order),
        source: definition.source,
        subtitle: definition.subtitle,
        body: detected?.body.trim() ?? "",
        sections: detected && "sections" in detected ? detected.sections.map((section) => ({
          id: section.id,
          title: section.title,
          level: section.level as 2 | 3,
        })) : undefined,
      };
    }),
    images: imageManifestCsv ? parseImageManifest(imageManifestCsv) : [],
  };
}
