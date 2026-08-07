import type { BookConfig } from "@/config/bookConfig";
import type { SupportedLocale } from "@/lib/localization";
import type { ExternalLink, ThemeId } from "@/lib/productTypes";
import {
  buildBookProject,
  contentBlocksToRawText,
  type BookContentBlock,
  type BookProject,
  type BookProjectInput,
  type ProjectBuildResult,
  type UploadedBookImage,
} from "@/lib/bookProject";
import type { BookThemeSettings } from "@/lib/themeSystem";
import { normalizeCoverDesign, type CoverDesign } from "@/lib/coverDesign";

export type CanonicalPublicationStatus = "draft" | "published" | "archived";
export type CanonicalPublicationVisibility = "private" | "unlisted" | "public";

/**
 * The editor-facing canonical asset reference. `storagePath` is persisted;
 * `localPreviewUrl` is a browser-only value used before/after a save.
 */
export type CanonicalAssetRef = {
  id: string;
  storagePath?: string;
  localPreviewUrl?: string;
  fileName: string;
  mimeType: string;
  size?: number;
  width?: number;
  height?: number;
  caption?: string;
  altText?: string;
  pageMode?: "inline" | "full-page";
  fitMode?: "contain" | "cover";
  insertChapter?: string;
  orderInChapter?: number;
};

export type CanonicalContentBlock =
  | {
      id: string;
      type: "text";
      content: string;
    }
  | {
      id: string;
      type: "image";
      assetId: string;
      pageMode: "inline" | "full-page";
      caption?: string;
      altText?: string;
      fitMode?: "contain" | "cover";
    };

export type CanonicalBookPayload = {
  bookId?: string;
  createdAt?: string;
  title: string;
  subtitle: string;
  authorName: string;
  description: string;
  publisherName: string;
  publishedAt: string;
  copyrightText: string;
  slug: string;
  language: SupportedLocale;
  theme: ThemeId;
  themeSettings: Partial<BookThemeSettings>;
  coverDesign: CoverDesign;
  bindingDirection: BookConfig["bindingDirection"];
  readerMode: "book";
  charactersPerPage: number;
  tableOfContentsItemsPerPage: number;
  contentBlocks: CanonicalContentBlock[];
  coverAsset?: CanonicalAssetRef;
  assets: CanonicalAssetRef[];
  externalLinks: ExternalLink[];
  authorHandle: string;
  authorBio: string;
  authorWebsiteUrl: string;
  authorXUrl: string;
  authorNoteUrl: string;
  externalSalesUrl: string;
  externalSalesLabel: string;
  publication: {
    status: CanonicalPublicationStatus;
    visibility: CanonicalPublicationVisibility;
  };
};

/** Short alias used when the payload is passed between editor commands. */
export type CanonicalPayload = CanonicalBookPayload;

export type CanonicalEditorState = {
  title: string;
  subtitle: string;
  author: string;
  description: string;
  publisherName: string;
  publishedAt: string;
  copyrightText: string;
  coverImage?: string;
  coverImageStoragePath?: string;
  coverFileName?: string;
  bindingDirection: BookConfig["bindingDirection"];
  theme: ThemeId;
  language: SupportedLocale;
  fontFamily: BookThemeSettings["fontFamily"];
  fontScale: BookThemeSettings["fontScale"];
  lineHeight: BookThemeSettings["lineHeight"];
  marginScale: BookThemeSettings["marginScale"];
  pageWidth: BookThemeSettings["pageWidth"];
  background: BookThemeSettings["background"];
  textColor: string;
  accentColor: string;
  coverStyle: BookThemeSettings["coverStyle"];
  imageLayout: BookThemeSettings["imageLayout"];
  coverDesign?: CoverDesign;
  charactersPerPage: number;
  tableOfContentsItemsPerPage: number;
  visibility: CanonicalPublicationVisibility;
  status: CanonicalPublicationStatus;
  slug: string;
  authorHandle: string;
  authorBio: string;
  authorWebsiteUrl: string;
  authorXUrl: string;
  authorNoteUrl: string;
  externalLinkLabel: string;
  externalLinkUrl: string;
  externalSalesUrl: string;
  externalSalesLabel: string;
};

export type BuildCanonicalBookPayloadInput = {
  state: CanonicalEditorState;
  contentBlocks: BookContentBlock[];
  images: UploadedBookImage[];
  bookId?: string;
  existingCreatedAt?: string;
  externalLinks?: ExternalLink[];
};

export type CanonicalPayloadBuildResult =
  | { ok: true; payload: CanonicalBookPayload }
  | { ok: false; errors: Record<string, string> };

const HTTP_OR_LOCAL_IMAGE_PATTERN = /^(?:https?:\/\/|data:image\/|blob:|\/)/i;
function isDisplayableImageUrl(value: string | undefined) {
  return Boolean(value && HTTP_OR_LOCAL_IMAGE_PATTERN.test(value));
}

function canonicalStoragePath(value: string | undefined) {
  if (!value || isDisplayableImageUrl(value)) return undefined;
  return value;
}

function canonicalPreviewUrl(value: string | undefined) {
  return isDisplayableImageUrl(value) ? value : undefined;
}

function assetFromUploadedImage(image: UploadedBookImage): CanonicalAssetRef {
  const storagePath = image.storagePath || canonicalStoragePath(image.dataUrl);
  const localPreviewUrl = canonicalPreviewUrl(image.displayUrl || image.dataUrl);
  return {
    id: image.id,
    storagePath,
    localPreviewUrl,
    fileName: image.fileName,
    mimeType: image.mimeType || "image/jpeg",
    size: image.size,
    caption: image.caption || undefined,
    altText: image.fileName,
    pageMode: "full-page",
    fitMode: "contain",
    insertChapter: image.insertChapter,
    orderInChapter: image.orderInChapter,
  };
}

function mergeAsset(
  current: CanonicalAssetRef | undefined,
  next: CanonicalAssetRef,
): CanonicalAssetRef {
  return {
    ...current,
    ...next,
    id: next.id,
    storagePath: next.storagePath || current?.storagePath,
    localPreviewUrl: next.localPreviewUrl || current?.localPreviewUrl,
    fileName: next.fileName || current?.fileName || next.id,
    mimeType: next.mimeType || current?.mimeType || "image/jpeg",
    caption: next.caption || current?.caption,
    altText: next.altText || current?.altText,
    width: next.width || current?.width,
    height: next.height || current?.height,
  };
}

/** Convert the current editor state into the only payload accepted by commands. */
export function buildCanonicalBookPayload(
  input: BuildCanonicalBookPayloadInput,
): CanonicalPayloadBuildResult {
  const errors: Record<string, string> = {};
  const state = input.state;
  const assetMap = new Map<string, CanonicalAssetRef>();

  for (const image of input.images) {
    const asset = assetFromUploadedImage(image);
    assetMap.set(asset.id, asset);
  }

  const contentBlocks: CanonicalContentBlock[] = input.contentBlocks.map((block) => {
    if (block.type === "text") {
      return { id: block.id, type: "text", content: block.content };
    }

    const existing = assetMap.get(block.id);
    const blockAsset = mergeAsset(existing, {
      id: block.id,
      storagePath: canonicalStoragePath(block.storagePath),
      localPreviewUrl: canonicalPreviewUrl(block.publicUrl || block.storagePath),
      fileName: block.fileName,
      mimeType: block.mimeType,
      width: block.width,
      height: block.height,
      caption: block.caption,
      altText: block.altText || block.fileName,
      pageMode: block.pageMode,
      fitMode: block.fitMode,
    });
    assetMap.set(block.id, blockAsset);

    return {
      id: block.id,
      type: "image",
      assetId: block.id,
      pageMode: block.pageMode,
      caption: block.caption,
      altText: block.altText,
      fitMode: block.fitMode,
    };
  });

  const coverValue = state.coverImageStoragePath || state.coverImage;
  const coverAsset = coverValue
    ? {
        id: "cover",
        storagePath: canonicalStoragePath(coverValue),
        localPreviewUrl: canonicalPreviewUrl(state.coverImage),
        fileName: state.coverFileName || "cover",
        mimeType: "image/jpeg",
      }
    : undefined;

  const title = state.title.trim();
  const authorName = state.author.trim();
  const rawText = contentBlocks
    .filter((block): block is Extract<CanonicalContentBlock, { type: "text" }> => block.type === "text")
    .map((block) => block.content)
    .join("\n")
    .trim();

  if (!title) errors.title = "タイトルを入力してください。";
  if (!authorName) errors.author = "作者名を入力してください。";
  if (!rawText && !contentBlocks.some((block) => block.type === "image")) {
    errors.rawText = "本文を入力してください。";
  }

  const payload: CanonicalBookPayload = {
    bookId: input.bookId && looksLikeUuid(input.bookId) ? input.bookId : undefined,
    createdAt: input.existingCreatedAt,
    title,
    subtitle: state.subtitle.trim(),
    authorName,
    description: state.description.trim(),
    publisherName: state.publisherName.trim(),
    publishedAt: state.publishedAt.trim(),
    copyrightText: state.copyrightText.trim(),
    slug: state.slug.trim(),
    language: state.language,
    theme: state.theme,
    themeSettings: {
      fontFamily: state.fontFamily,
      fontScale: state.fontScale,
      lineHeight: state.lineHeight,
      marginScale: state.marginScale,
      pageWidth: state.pageWidth,
      background: state.background,
      textColor: state.textColor,
      accentColor: state.accentColor,
      coverStyle: state.coverStyle,
      imageLayout: state.imageLayout,
    },
    coverDesign: normalizeCoverDesign(state.coverDesign),
    bindingDirection: state.bindingDirection,
    readerMode: "book",
    charactersPerPage: state.charactersPerPage,
    tableOfContentsItemsPerPage: state.tableOfContentsItemsPerPage,
    contentBlocks,
    coverAsset,
    assets: [...assetMap.values()],
    externalLinks: input.externalLinks || [],
    authorHandle: state.authorHandle,
    authorBio: state.authorBio,
    authorWebsiteUrl: state.authorWebsiteUrl,
    authorXUrl: state.authorXUrl,
    authorNoteUrl: state.authorNoteUrl,
    externalSalesUrl: state.externalSalesUrl,
    externalSalesLabel: state.externalSalesLabel,
    publication: {
      status: state.status,
      visibility: state.visibility,
    },
  };

  return Object.keys(errors).length ? { ok: false, errors } : { ok: true, payload };
}

function toUploadedImage(asset: CanonicalAssetRef): UploadedBookImage {
  const displayUrl = asset.localPreviewUrl;
  return {
    id: asset.id,
    fileName: asset.fileName,
    dataUrl: displayUrl || asset.storagePath || "",
    storagePath: asset.storagePath,
    displayUrl,
    mimeType: asset.mimeType || "image/jpeg",
    size: asset.size || 0,
    caption: asset.caption || "",
    insertChapter: asset.insertChapter || "",
    orderInChapter: asset.orderInChapter || 0,
  };
}

export function canonicalPayloadToBookProjectInput(payload: CanonicalBookPayload): BookProjectInput {
  const assetMap = new Map(payload.assets.map((asset) => [asset.id, asset]));
  if (payload.coverAsset) assetMap.set(payload.coverAsset.id, payload.coverAsset);

  const contentBlocks: BookContentBlock[] = payload.contentBlocks.map((block) => {
    if (block.type === "text") {
      return { id: block.id, type: "text", content: block.content };
    }
    const asset = assetMap.get(block.assetId);
    return {
      id: block.id,
      type: "image",
      storagePath: asset?.storagePath || asset?.localPreviewUrl || "",
      publicUrl: asset?.localPreviewUrl,
      fileName: asset?.fileName || block.assetId,
      mimeType: asset?.mimeType || "image/jpeg",
      width: asset?.width || 1200,
      height: asset?.height || 800,
      caption: block.caption || asset?.caption,
      altText: block.altText || asset?.altText || asset?.fileName,
      fitMode: block.fitMode === "cover" ? "cover" : "contain",
      pageMode: block.pageMode === "inline" ? "inline" : "full-page",
      uploadState: "ready",
    };
  });

  const images = payload.assets.map(toUploadedImage);
  const rawText = contentBlocksToRawText(contentBlocks);

  return {
    title: payload.title,
    slug: payload.slug,
    publicationStatus: payload.publication.status,
    publicationVisibility: payload.publication.visibility,
    subtitle: payload.subtitle,
    author: payload.authorName,
    description: payload.description,
    publisherName: payload.publisherName,
    publishedAt: payload.publishedAt,
    copyrightText: payload.copyrightText,
    rawText,
    coverImage: payload.coverAsset?.storagePath || payload.coverAsset?.localPreviewUrl,
    bindingDirection: payload.bindingDirection,
    theme: payload.theme,
    language: payload.language,
    themeSettings: payload.themeSettings,
    coverDesign: normalizeCoverDesign(payload.coverDesign),
    charactersPerPage: payload.charactersPerPage,
    tableOfContentsItemsPerPage: payload.tableOfContentsItemsPerPage,
    images,
    contentBlocks,
    authorHandle: payload.authorHandle,
    authorBio: payload.authorBio,
    authorWebsiteUrl: payload.authorWebsiteUrl,
    authorXUrl: payload.authorXUrl,
    authorNoteUrl: payload.authorNoteUrl,
    externalLinks: payload.externalLinks,
    externalSalesUrl: payload.externalSalesUrl,
    externalSalesLabel: payload.externalSalesLabel,
    existingBookId: payload.bookId && looksLikeUuid(payload.bookId) ? payload.bookId : undefined,
    existingCreatedAt: payload.createdAt,
  };
}

export function buildBookProjectFromCanonicalPayload(payload: CanonicalBookPayload): ProjectBuildResult {
  return buildBookProject(canonicalPayloadToBookProjectInput(payload));
}

export function mergeSavedProjectIntoCanonicalPayload(
  payload: CanonicalBookPayload,
  project: BookProject,
  record: {
    id: string;
    slug: string;
    status: CanonicalPublicationStatus;
    visibility: CanonicalPublicationVisibility;
  },
): CanonicalBookPayload {
  const pathByAssetId = new Map<string, string>();
  for (const image of project.images) {
    const id = image.image_id || image.image_index;
    const path = image.storage_path || image.image_url;
    if (id && path) pathByAssetId.set(id, path);
  }
  for (const block of project.contentBlocks || []) {
    if (block.type === "image" && block.storagePath) {
      pathByAssetId.set(block.id, block.storagePath);
    }
  }

  return {
    ...payload,
    bookId: record.id,
    slug: record.slug,
    publication: {
      status: record.status,
      visibility: record.visibility,
    },
    createdAt: project.createdAt,
    coverAsset: payload.coverAsset
      ? {
          ...payload.coverAsset,
          storagePath: project.config.coverImage || payload.coverAsset.storagePath,
        }
      : undefined,
    assets: payload.assets.map((asset) => ({
      ...asset,
      storagePath: pathByAssetId.get(asset.id) || asset.storagePath,
    })),
  };
}

export function canonicalContentBlocksToEditorBlocks(
  payload: CanonicalBookPayload,
): BookContentBlock[] {
  const assetMap = new Map(payload.assets.map((asset) => [asset.id, asset]));
  return payload.contentBlocks.map((block) => {
    if (block.type === "text") return block;
    const asset = assetMap.get(block.assetId);
    return {
      id: block.id,
      type: "image",
      storagePath: asset?.storagePath || asset?.localPreviewUrl || "",
      publicUrl: asset?.localPreviewUrl,
      fileName: asset?.fileName || block.assetId,
      mimeType: asset?.mimeType || "image/jpeg",
      width: asset?.width || 1200,
      height: asset?.height || 800,
      caption: block.caption || asset?.caption,
      altText: block.altText || asset?.altText,
      fitMode: block.fitMode === "cover" ? "cover" : "contain",
      pageMode: block.pageMode === "inline" ? "inline" : "full-page",
      uploadState: "ready" as const,
    };
  });
}

export function canonicalAssetsToUploadedImages(
  payload: CanonicalBookPayload,
): UploadedBookImage[] {
  return payload.assets.map((asset, index) => ({
    id: asset.id,
    fileName: asset.fileName,
    dataUrl: asset.localPreviewUrl || asset.storagePath || "",
    storagePath: asset.storagePath,
    displayUrl: asset.localPreviewUrl,
    mimeType: asset.mimeType || "image/jpeg",
    size: asset.size || 0,
    caption: asset.caption || "",
    insertChapter: asset.insertChapter || "",
    orderInChapter: asset.orderInChapter || index + 1,
  }));
}

function looksLikeUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}
