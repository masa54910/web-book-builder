/** Deterministic heading recognition shared by import, pagination and reader metadata. */
export type DocumentHeadingLevel = 1 | 2 | 3;

export type DocumentHeading = {
  level: DocumentHeadingLevel;
  title: string;
  marker: string;
};

export type DocumentSection = DocumentHeading & {
  id: string;
  parentId: string;
};

export type DocumentChapter = DocumentHeading & {
  id: string;
  sections: DocumentSection[];
};

export type DocumentStructure = {
  chapters: DocumentChapter[];
};

export type DocumentTocEntry = {
  headingId: string;
  title: string;
  level: 1 | 2;
  readerPageIndex?: number;
  readerPageNumber?: number;
  locked?: boolean;
};

function stableSlug(value: string) {
  return value
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^\p{Letter}\p{Number}]+/gu, "-")
    .replace(/^-+|-+$/g, "") || "heading";
}

const JAPANESE_CHAPTER = /^(\u7b2c[0-9\uFF10-\uFF19\u4e00\u4e8c\u4e09\u56db\u4e94\u516d\u4e03\u516b\u4e5d\u5341\u767e\u5343]+\u7ae0|\u5e8f\u7ae0|\u7d42\u7ae0|\u7d42\u308f\u308a)[\s:\uFF1A\u3001\uFF5C|.\-]*(.*)$/u;
const NUMBERED_HEADING = /^(\d{1,2}|[\uFF10-\uFF19]{1,2})(?:[\uFF5C|\uFF0E.\u3001)\uFF09])\s*(\S.*)$/u;

/** Recognise only unambiguous headings; ordinary numbered prose remains body text. */
export function parseDocumentHeading(line: string): DocumentHeading | null {
  const source = line.replace(/\r$/, "");
  const markdown = source.match(/^(#{1,3})\s+(\S(?:.*\S)?)\s*$/u);
  if (markdown) {
    return {
      level: Math.min(3, markdown[1].length) as DocumentHeadingLevel,
      title: markdown[2].trim(),
      marker: markdown[1],
    };
  }
  const chapter = source.match(JAPANESE_CHAPTER);
  if (chapter) {
    const suffix = chapter[2]?.trim();
    return { level: 1, title: suffix ? `${chapter[1]} ${suffix}` : chapter[1], marker: "" };
  }
  const numbered = source.match(NUMBERED_HEADING);
  if (numbered) return { level: 2, title: source.trim(), marker: "" };
  return null;
}

export function findDocumentHeadings(text: string) {
  return text
    .replace(/^\uFEFF/, "")
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((line, index) => ({ ...parseDocumentHeading(line), line, index }))
    .filter((entry): entry is { level: DocumentHeadingLevel; title: string; marker: string; line: string; index: number } => Boolean(entry.title));
}

/** Build a deterministic hierarchy from the shared heading parser. */
export function parseDocumentStructure(text: string, fallbackTitle = "本文"): DocumentStructure {
  const normalized = text.replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n");
  const headings = findDocumentHeadings(normalized);
  const h1 = headings.filter((heading) => heading.level === 1);
  if (!h1.length) {
    return {
      chapters: [{
        level: 1,
        title: fallbackTitle.trim() || "本文",
        marker: "",
        id: `chapter-${stableSlug(fallbackTitle)}`,
        sections: [],
      }],
    };
  }
  const chapters: DocumentChapter[] = [];
  for (const [chapterIndex, heading] of h1.entries()) {
    const id = `chapter-${stableSlug(heading.title)}-${chapterIndex + 1}`;
    const nextChapterIndex = h1[chapterIndex + 1]?.index ?? Number.POSITIVE_INFINITY;
    const sections = headings
      .filter((candidate) => candidate.level === 2 || candidate.level === 3)
      .filter((candidate) => candidate.index > heading.index && candidate.index < nextChapterIndex)
      .map((candidate, sectionIndex) => ({
        ...candidate,
        id: `${id}-section-${stableSlug(candidate.title)}-${sectionIndex + 1}`,
        parentId: id,
      }));
    chapters.push({ ...heading, id, sections });
  }
  return { chapters };
}

export function buildDocumentTocEntries(
  structure: DocumentStructure,
  pageByHeadingId?: ReadonlyMap<string, { pageIndex: number; pageNumber: number }>,
): DocumentTocEntry[] {
  return structure.chapters.flatMap((chapter) => {
    const chapterPage = pageByHeadingId?.get(chapter.id);
    const chapterEntry: DocumentTocEntry = {
      headingId: chapter.id,
      title: chapter.title,
      level: 1,
      readerPageIndex: chapterPage?.pageIndex,
      readerPageNumber: chapterPage?.pageNumber,
    };
    const sectionEntries = chapter.sections
      .filter((section) => section.level === 2)
      .map((section) => {
        const page = pageByHeadingId?.get(section.id);
        return {
          headingId: section.id,
          title: section.title,
          level: 2 as const,
          readerPageIndex: page?.pageIndex,
          readerPageNumber: page?.pageNumber,
        };
      });
    return [chapterEntry, ...sectionEntries];
  });
}

/** Runtime adapter for legacy chapter payloads that predate Document Structure. */
export function documentStructureFromChapters(
  chapters: Array<{ id: string; title: string; body?: string; sections?: Array<{ id: string; title: string; level: 2 | 3 }> }>,
): DocumentStructure {
  return {
    chapters: chapters.map((chapter) => {
      const derivedSections = chapter.sections?.length
        ? chapter.sections
        : parseDocumentStructure(chapter.body || "", chapter.title).chapters[0]?.sections.map((section, index) => ({
            id: `${chapter.id}-section-${index + 1}`,
            title: section.title,
            level: section.level,
          })) || [];
      return {
      id: chapter.id,
      title: chapter.title,
      level: 1,
      marker: "",
      sections: derivedSections.map((section) => ({
        id: section.id,
        title: section.title,
        level: section.level,
        marker: "",
        parentId: chapter.id,
      })),
      };
    }),
  };
}

/**
 * Conservative, local-only classification used by the explicit Smart Format
 * action.  This intentionally sits beside the normal heading parser so the
 * two flows share the same normalization and heading vocabulary.
 */
export type SmartLineClassification = "chapter" | "subheading" | "paragraph";

const SMART_CHAPTER_LINE = /^(?:第[0-9０-９一二三四五六七八九十百千]+章(?:[\s:：、｜|.・-].*)?|序章|終章|プロローグ|エピローグ|はじめに|おわりに|あとがき|まとめ)$/u;
// A dedicated visual separator keeps ordinary numbered lists ("1. item")
// from being promoted to chapters. Smart Format only treats explicit chapter
// labels such as "01｜タイトル" or "01: タイトル" as chapter candidates.
const SMART_NUMBERED_CHAPTER = /^(?:0?[1-9]|1[0-9]|2[0-9])[｜|・:：-]+\s*\S.+$/u;
const LIST_LINE = /^(?:[-*・•]|[0-9０-９]+[.)）]|[①-⑳])\s*/u;

/** Classify one already-normalized, independent line without rewriting it. */
export function classifySmartLine(line: string, isolated = true): SmartLineClassification {
  const value = line.replace(/\r$/, "").trim();
  if (!value) return "paragraph";
  if (SMART_CHAPTER_LINE.test(value) || SMART_NUMBERED_CHAPTER.test(value)) return "chapter";
  if (
    isolated &&
    value.length <= 40 &&
    !/[。！？!?]$/u.test(value) &&
    !LIST_LINE.test(value) &&
    !/^https?:\/\//i.test(value) &&
    !/^[「『("].*[」』)"]$/u.test(value)
  ) {
    return "subheading";
  }
  return "paragraph";
}
