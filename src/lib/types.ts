import type { TextMark } from "@/lib/textStyles";

export type NovelChapter = {
  id: string;
  order: number;
  title: string;
  slug: string;
  source: string;
  subtitle?: string;
  body: string;
  sections?: Array<{ id: string; title: string; level: 2 | 3 }>;
};

export type ImageManifestRow = {
  chapter_order: number;
  chapter_title: string;
  image_index: string;
  image_id?: string;
  image_url: string;
  /** Canonical persisted Storage reference/path. */
  storage_path?: string;
  /** Runtime-only HTTP URL. Never persist signed URLs. */
  public_url?: string;
  alt: string;
  caption: string;
  source_path: string;
  local_path: string;
};

export type ChapterManifestRow = {
  order: number;
  id: string;
  title: string;
  source: string;
  subtitle?: string;
};

type ReaderPageShape =
  | { id: "cover"; kind: "cover" }
  | { id: "title"; kind: "title" }
  | {
      id: string;
      kind: "contents";
      chapterStart: number;
      chapterEnd: number;
      tocEntryStart?: number;
      tocEntryEnd?: number;
      part: number;
      totalParts: number;
    }
  | {
      id: string;
      kind: "chapterTitle";
      chapterOrder: number;
      chapterTitle: string;
      chapterSlug: string;
      headingId?: string;
    }
  | {
      id: string;
      kind: "text";
      chapterTitle: string;
      sectionTitle?: string;
      headingId?: string;
      paragraphs: string[];
      paragraphRuns?: TextMark[][];
    }
  | {
      id: string;
      kind: "image";
      chapterTitle: string;
      sectionTitle?: string;
      headingId?: string;
      imageIndex: string;
      imageId: string;
      src?: string;
      alt: string;
      caption: string;
      missing?: boolean;
      displaySize?: "small" | "medium" | "large" | "full";
    }
  | {
      id: string;
      kind: "youtube";
      chapterTitle: string;
      sectionTitle?: string;
      headingId?: string;
      videoId: string;
      originalUrl: string;
      displaySize?: "small" | "medium" | "large" | "full";
    }
  | {
      id: string;
      kind: "pageBreak";
      sourcePageId: string;
    }
  | { id: "colophon"; kind: "colophon" }
  | { id: "back-cover"; kind: "backCover" };

/**
 * Rendered-page metadata used by Preview adjustments. A page may contain
 * multiple source blocks; the page id is kept as a stable fallback for
 * legacy projects that do not carry block metadata.
 */
export type ReaderPage = ReaderPageShape & {
  sourceBlockIds?: string[];
};
