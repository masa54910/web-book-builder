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
import { createSlugCandidate } from "@/lib/slug";
import type { ImageManifestRow, NovelChapter } from "@/lib/types";

export const BOOK_PROJECT_VERSION = 1;

export type BookContentBlock =
  | {
      id: string;
      type: "text";
      content: string;
    }
  | {
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
      uploadState?: "pending" | "ready" | "error";
      errorMessage?: string;
    };

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
  contentBlocks?: BookContentBlock[];
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
};

export type ProjectBuildResult =
  | { ok: true; project: BookProject }
  | { ok: false; errors: Record<string, string> };

const IMAGE_REFERENCE_PATTERN = /\[\[image:([A-Za-z0-9._-]+)(?:\|([^\]|]*))?(?:\|(inline|full-page))?\]\]/g;

function blockId(prefix: string, index: number) {
  return `${prefix}-${String(index + 1).padStart(3, "0")}`;
}

function normalizeBlockId(value: string, fallbackPrefix: string, index: number) {
  const candidate =
    value
      .normalize("NFKD")
      .toLowerCase()
      .replace(/[^a-z0-9._-]+/g, "-")
      .replace(/^-+|-+$/g, "") || blockId(fallbackPrefix, index);
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

function normalizeContentBlocks(blocks: BookContentBlock[]) {
  const normalized: BookContentBlock[] = [];

  for (const [index, block] of blocks.entries()) {
    if (block.type === "text") {
      normalized.push({
        id: normalizeBlockId(block.id, "text", index),
        type: "text",
        content: typeof block.content === "string" ? block.content : "",
      });
      continue;
    }

    const storagePath =
      typeof block.storagePath === "string" && block.storagePath
        ? block.storagePath
        : block.publicUrl || "";
    if (!storagePath) continue;

    normalized.push({
      id: normalizeBlockId(block.id, "image", index),
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
      uploadState: block.uploadState,
      errorMessage: block.errorMessage?.trim() || undefined,
    });
  }

  return normalized;
}

export function contentBlocksToRawText(blocks: BookContentBlock[]) {
  const parts = blocks.map((block) => {
    if (block.type === "text") {
      return block.content;
    }

    const caption = block.caption?.trim();
    const mode = block.pageMode === "inline" ? "inline" : "full-page";
    if (caption) {
      return `[[image:${block.id}|${caption}|${mode}]]`;
    }
    return `[[image:${block.id}||${mode}]]`;
  });

  return normalizeLineBreaks(parts.join("\n\n"));
}

export function contentBlocksFromLegacy(rawText: string, images: UploadedBookImage[]): BookContentBlock[] {
  const text = normalizeLineBreaks(rawText);
  const imageById = new Map(images.map((image) => [image.id, image]));
  const usedImageIds = new Set<string>();
  const blocks: BookContentBlock[] = [];
  const pattern = /\[\[image:([A-Za-z0-9._-]+)(?:\|([^\]|]*))?(?:\|(inline|full-page))?\]\]/g;
  let cursor = 0;
  let match: RegExpExecArray | null = null;

  while ((match = pattern.exec(text))) {
    const textPart = text.slice(cursor, match.index);
    if (textPart) {
      blocks.push({
        id: blockId("text", blocks.length),
        type: "text",
        content: textPart,
      });
    }

    const imageId = match[1];
    const image = imageById.get(imageId);
    if (image) {
      usedImageIds.add(image.id);
      blocks.push({
        id: image.id,
        type: "image",
        storagePath: image.dataUrl,
        fileName: image.fileName,
        mimeType: image.mimeType || "image/jpeg",
        width: 1200,
        height: 800,
        caption: image.caption || match[2] || undefined,
        altText: image.fileName,
        fitMode: "contain",
        pageMode: match[3] === "inline" ? "inline" : "full-page",
        uploadState: "ready",
      });
    } else {
      blocks.push({
        id: blockId("text", blocks.length),
        type: "text",
        content: match[0],
      });
    }

    cursor = pattern.lastIndex;
  }

  const tail = text.slice(cursor);
  if (tail) {
    blocks.push({
      id: blockId("text", blocks.length),
      type: "text",
      content: tail,
    });
  }

  for (const [index, image] of images.entries()) {
    if (usedImageIds.has(image.id)) continue;
    blocks.push({
      id: image.id || blockId("image", index),
      type: "image",
      storagePath: image.dataUrl,
      fileName: image.fileName,
      mimeType: image.mimeType || "image/jpeg",
      width: 1200,
      height: 800,
      caption: image.caption || undefined,
      altText: image.fileName,
      fitMode: "contain",
      pageMode: "full-page",
      uploadState: "ready",
    });
  }

  if (!blocks.length) {
    blocks.push({
      id: blockId("text", 0),
      type: "text",
      content: "",
    });
  }

  return normalizeContentBlocks(blocks);
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

function imageRowsFromBlocks(blocks: BookContentBlock[], legacyImages: UploadedBookImage[]) {
  const legacyById = new Map(legacyImages.map((image) => [image.id, image]));

  return blocks
    .filter((block): block is Extract<BookContentBlock, { type: "image" }> => block.type === "image")
    .map((block) => {
      const legacy = legacyById.get(block.id);
      const imageUrl = block.publicUrl || block.storagePath || legacy?.dataUrl || "";
      const source = block.fileName || legacy?.fileName || block.id;
      const caption = block.caption || legacy?.caption || "";

      const row: ImageManifestRow = {
        chapter_order: 1,
        chapter_title: "1",
        image_index: block.id,
        image_id: block.id,
        image_url: imageUrl,
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

  if (!title) errors.title = "タイトルを入力してください。";
  if (!author) errors.author = "著者名を入力してください。";
  if (!rawText && !contentBlocks.some((block) => block.type === "image")) {
    errors.rawText = "本文を入力してください。";
  }

  const pendingImage = contentBlocks.find(
    (block) => block.type === "image" && block.uploadState === "pending",
  );
  if (pendingImage) {
    errors.rawText = "画像の読み込みが完了してから保存してください。";
  }
  const failedImage = contentBlocks.find(
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
  const chapters = extractChaptersFromText(rawText, title);
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
