import type { BookConfig } from "@/config/bookConfig";
import { normalizeLocale, type SupportedLocale } from "@/lib/localization";
import type { BookThemeSettings } from "@/lib/themeSystem";
import {
  DEFAULT_BRANDING,
  DEFAULT_MONETIZATION,
  normalizeHandle,
  safeExternalUrl,
  type ExternalLink,
} from "@/lib/productTypes";
import type { ImageManifestRow, NovelChapter } from "@/lib/types";

export const BOOK_PROJECT_VERSION = 1;

export type UploadedBookImage = {
  id: string;
  fileName: string;
  dataUrl: string;
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
  images: ImageManifestRow[];
  missingImageIds: string[];
  createdAt: string;
  updatedAt: string;
};

export type BookProjectInput = {
  title: string;
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
  charactersPerPage: number;
  tableOfContentsItemsPerPage: number;
  images: UploadedBookImage[];
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
};

export type ProjectBuildResult =
  | { ok: true; project: BookProject }
  | { ok: false; errors: Record<string, string> };

const IMAGE_REFERENCE_PATTERN = /\[\[image:([A-Za-z0-9._-]+)(?:\|([^\]]*))?\]\]/g;

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

function stableBookId(title: string, author: string, previous?: string) {
  if (previous) return previous;
  const base = slugify(`${title}-${author}`, "untitled-book");
  return `preview-${base}`;
}

function normalizeLineBreaks(value: string) {
  return value.replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n").trim();
}

export function extractChaptersFromText(rawText: string, fallbackTitle: string): NovelChapter[] {
  const text = normalizeLineBreaks(rawText);
  if (!text) return [];

  const headings = [...text.matchAll(/^# (?!#)([^\n]+)$/gm)];
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
    const title = heading[1].trim() || `第${order}章`;
    const bodyStart = (heading.index ?? 0) + heading[0].length;
    const bodyEnd = headings[index + 1]?.index ?? text.length;
    const body = text.slice(bodyStart, bodyEnd).trim();
    const slug = uniqueSlug(title, order, usedSlugs);
    return {
      id: slug,
      order,
      title,
      slug,
      source: "browser-input",
      body,
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
    image_url: image.dataUrl,
    alt: image.fileName,
    caption: image.caption,
    source_path: image.fileName,
    local_path: "",
  }));
}

export function buildBookProject(input: BookProjectInput): ProjectBuildResult {
  const errors: Record<string, string> = {};
  const title = input.title.trim();
  const author = input.author.trim();
  const rawText = normalizeLineBreaks(input.rawText);

  if (!title) errors.title = "タイトルを入力してください。";
  if (!author) errors.author = "著者名を入力してください。";
  if (!rawText) errors.rawText = "本文を入力してください。";

  if (Object.keys(errors).length > 0) return { ok: false, errors };

  const now = new Date().toISOString();
  const bookId = stableBookId(title, author, input.existingBookId);
  const authorHandle = normalizeHandle(input.authorHandle || author, slugify(author, "author"));
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
  const chapters = extractChaptersFromText(rawText, title);
  const imageRows = buildImageRows(input.images);
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
        title,
        subtitle: input.subtitle.trim(),
        author,
        description: input.description.trim(),
        language: normalizeLocale(input.language),
        coverImage: input.coverImage,
        bindingDirection: input.bindingDirection,
        theme: input.theme,
        themeSettings: input.themeSettings,
        tableOfContentsItemsPerPage: Math.max(1, input.tableOfContentsItemsPerPage),
        charactersPerPage: Math.max(180, input.charactersPerPage),
        publisherName: input.publisherName.trim() || "WebBookMaker",
        publishedAt: input.publishedAt.trim() || String(new Date().getFullYear()),
        copyrightText: input.copyrightText.trim() || `© ${author}`,
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
