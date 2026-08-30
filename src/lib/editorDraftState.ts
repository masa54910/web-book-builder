import {
  contentBlocksFromLegacy,
  contentBlocksToRawText,
  type BookContentBlock,
  type BookColumnChildBlock,
  type UploadedBookImage,
} from "@/lib/bookProject";
import type { SupportedLocale } from "@/lib/localization";
import type { ThemeId } from "@/lib/productTypes";
import type { BookThemeSettings } from "@/lib/themeSystem";
import { DEFAULT_COVER_DESIGN, normalizeCoverDesign, type CoverDesign } from "@/lib/coverDesign";
import { normalizePageAdjustments, type PageAdjustment } from "@/lib/pageAdjustments";
import { isValidYouTubeVideoId } from "@/lib/youtube";

export type EditorDraftState = {
  title: string;
  subtitle: string;
  author: string;
  description: string;
  publisherName: string;
  publishedAt: string;
  copyrightText: string;
  rawText: string;
  coverImage?: string;
  coverImageStoragePath?: string;
  coverFileName?: string;
  bindingDirection: "rtl" | "ltr";
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
  pageAdjustments?: PageAdjustment[];
  charactersPerPage: number;
  tableOfContentsItemsPerPage: number;
  visibility: "private" | "unlisted" | "public";
  status: "draft" | "published" | "archived";
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

export type DraftSeed = {
  state: EditorDraftState;
  images: UploadedBookImage[];
  contentBlocks: BookContentBlock[];
  restored: boolean;
};

function asString(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function asNumber(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function isEphemeralImageReference(value: unknown) {
  return typeof value === "string" && /^(?:data:|blob:)/i.test(value);
}

function isUsableStorageReference(value: unknown) {
  return typeof value === "string" && value.trim().length > 0 && !isEphemeralImageReference(value);
}

function isUsableDisplayReference(value: unknown) {
  return isUsableStorageReference(value) && !/^storage:/i.test(String(value));
}

function isDraftContentBlock(value: unknown): value is BookContentBlock {
  if (typeof value !== "object" || value === null) return false;
  const block = value as Partial<BookContentBlock>;
  if (block.type === "columns") {
    const columns = value as { id?: unknown; ratio?: unknown; left?: { blocks?: unknown }; right?: { blocks?: unknown } };
    const validChild = (child: unknown) => {
      if (!child || typeof child !== "object") return false;
      const candidate = child as Partial<BookColumnChildBlock>;
      if (candidate.type === "text") return typeof candidate.id === "string" && typeof candidate.content === "string";
      if (candidate.type === "youtube") return typeof candidate.id === "string" && typeof candidate.videoId === "string" && isValidYouTubeVideoId(candidate.videoId) && typeof candidate.originalUrl === "string";
      return candidate.type === "image" && typeof candidate.id === "string" && typeof candidate.storagePath === "string" && typeof candidate.fileName === "string" && typeof candidate.mimeType === "string";
    };
    return typeof columns.id === "string" && (columns.ratio === "50-50" || columns.ratio === "40-60" || columns.ratio === "60-40") && Array.isArray(columns.left?.blocks) && Array.isArray(columns.right?.blocks) && columns.left.blocks.every(validChild) && columns.right.blocks.every(validChild);
  }
  if (block.type === "text") {
    return typeof block.id === "string" && typeof block.content === "string";
  }
  if (block.type === "youtube") {
    return (
      typeof block.id === "string" &&
      typeof block.videoId === "string" &&
      isValidYouTubeVideoId(block.videoId) &&
      typeof block.originalUrl === "string"
    );
  }
  if (block.type === "paywall") {
    return typeof block.id === "string";
  }
  return (
    block.type === "image" &&
    typeof block.id === "string" &&
    typeof block.storagePath === "string" &&
    typeof block.fileName === "string" &&
    typeof block.mimeType === "string"
  );
}

export function buildEditorDraftFields(input: {
  mode: "new" | "edit";
  state: EditorDraftState;
  images: UploadedBookImage[];
  contentBlocks: BookContentBlock[];
  draftId: string;
}) {
  const safeImages: UploadedBookImage[] = input.images
    .map((image) => {
      const storagePath = isUsableStorageReference(image.storagePath) ? image.storagePath : undefined;
      const dataUrl = isUsableDisplayReference(image.dataUrl) ? image.dataUrl : "";
      const displayUrl = isUsableDisplayReference(image.displayUrl) ? image.displayUrl : undefined;
      return {
        ...image,
        storagePath,
        dataUrl,
        displayUrl,
      };
    })
    .filter((image) => Boolean(image.storagePath || image.dataUrl || image.displayUrl));

  const sanitizeBlock = (block: BookContentBlock): BookContentBlock | null => {
      if (block.type === "columns") {
        const sanitizeChild = (child: BookColumnChildBlock) => sanitizeBlock(child as BookContentBlock) as BookColumnChildBlock | null;
        return {
          ...block,
          left: { blocks: block.left.blocks.map(sanitizeChild).filter((child): child is BookColumnChildBlock => Boolean(child)) },
          right: { blocks: block.right.blocks.map(sanitizeChild).filter((child): child is BookColumnChildBlock => Boolean(child)) },
        };
      }
      if (block.type !== "image") return block;
      const storagePath = isUsableStorageReference(block.storagePath) ? block.storagePath : "";
      const publicUrl = isUsableDisplayReference(block.publicUrl) ? block.publicUrl : undefined;
      if (!storagePath && !publicUrl) return null;
      return {
        ...block,
        storagePath,
        publicUrl,
      };
  };
  const safeContentBlocks: BookContentBlock[] = input.contentBlocks.map(sanitizeBlock).filter((block): block is BookContentBlock => Boolean(block));

  const safeState = {
    ...input.state,
    rawText: safeContentBlocks.length ? contentBlocksToRawText(safeContentBlocks) : input.state.rawText,
    coverImage: isUsableDisplayReference(input.state.coverImage) ? input.state.coverImage : undefined,
    coverImageStoragePath: isUsableStorageReference(input.state.coverImageStoragePath)
      ? input.state.coverImageStoragePath
      : undefined,
  };

  return {
    ...safeState,
    mode: input.mode,
    draftId: input.draftId,
    images: safeImages,
    contentBlocks: safeContentBlocks,
  } satisfies Record<string, unknown>;
}

export function seedFromDraftFields(input: {
  mode: "new" | "edit";
  initialState: EditorDraftState;
  fields?: Record<string, unknown>;
}): DraftSeed {
  if (!input.fields || typeof input.fields !== "object" || Array.isArray(input.fields)) {
    return {
      state: input.initialState,
      images: [],
      contentBlocks: [{ id: "text-001", type: "text", content: "" }],
      restored: false,
    };
  }

  const fields = input.fields;
  const rawText = asString(fields.rawText);
  const draftImages = Array.isArray(fields.images)
    ? fields.images.filter((image): image is UploadedBookImage => {
        return (
          typeof image === "object" &&
          image !== null &&
          typeof (image as UploadedBookImage).id === "string" &&
          typeof (image as UploadedBookImage).fileName === "string" &&
          typeof (image as UploadedBookImage).dataUrl === "string" &&
          Boolean(
            (image as UploadedBookImage).dataUrl ||
              (image as UploadedBookImage).storagePath ||
              (image as UploadedBookImage).displayUrl,
          )
        );
      })
    : [];
  const draftBlocks = Array.isArray(fields.contentBlocks)
    ? fields.contentBlocks.filter(isDraftContentBlock)
    : contentBlocksFromLegacy(rawText, draftImages);
  const fromLanding = asString(fields.source) === "landing";
  const storedCoverDesign = normalizeCoverDesign(fields.coverDesign ?? input.initialState.coverDesign);
  const hasCustomCoverDesign = JSON.stringify(storedCoverDesign) !== JSON.stringify(DEFAULT_COVER_DESIGN);
  const hasAnyDraftContent = Boolean(
    asString(fields.title, input.initialState.title).trim() ||
      asString(fields.author, input.initialState.author).trim() ||
      asString(fields.description, input.initialState.description).trim() ||
      asString(fields.authorHandle, input.initialState.authorHandle).trim() ||
      asString(fields.slug, input.initialState.slug).trim() ||
      rawText.trim() ||
      draftImages.length ||
      draftBlocks.length > 1 ||
      draftBlocks.some((block) => block.type === "columns") ||
      asString(fields.coverImage).trim() ||
      asString(fields.coverImageStoragePath).trim() ||
      hasCustomCoverDesign,
  );

  const restoredState: EditorDraftState = {
    ...input.initialState,
    title: asString(fields.title, input.initialState.title),
    subtitle: asString(fields.subtitle, input.initialState.subtitle),
    author: asString(fields.author, input.initialState.author),
    description: asString(fields.description, input.initialState.description),
    publisherName: asString(fields.publisherName, input.initialState.publisherName),
    publishedAt: asString(fields.publishedAt, input.initialState.publishedAt),
    copyrightText: asString(fields.copyrightText, input.initialState.copyrightText),
    rawText,
    coverImage: isUsableDisplayReference(fields.coverImage) ? asString(fields.coverImage) : undefined,
    coverImageStoragePath: isUsableStorageReference(fields.coverImageStoragePath)
      ? asString(fields.coverImageStoragePath)
      : undefined,
    coverFileName: asString(fields.coverFileName) || undefined,
    bindingDirection: fields.bindingDirection === "ltr" ? "ltr" : "rtl",
    theme: asString(fields.theme, input.initialState.theme) as ThemeId,
    language: asString(fields.language, input.initialState.language) as SupportedLocale,
    fontFamily: asString(fields.fontFamily, input.initialState.fontFamily) as BookThemeSettings["fontFamily"],
    fontScale: asString(fields.fontScale, input.initialState.fontScale) as BookThemeSettings["fontScale"],
    lineHeight: asString(fields.lineHeight, input.initialState.lineHeight) as BookThemeSettings["lineHeight"],
    marginScale: asString(fields.marginScale, input.initialState.marginScale) as BookThemeSettings["marginScale"],
    pageWidth: asString(fields.pageWidth, input.initialState.pageWidth) as BookThemeSettings["pageWidth"],
    background: asString(fields.background, input.initialState.background) as BookThemeSettings["background"],
    textColor: asString(fields.textColor, input.initialState.textColor),
    accentColor: asString(fields.accentColor, input.initialState.accentColor),
    coverStyle: asString(fields.coverStyle, input.initialState.coverStyle) as BookThemeSettings["coverStyle"],
    imageLayout: asString(fields.imageLayout, input.initialState.imageLayout) as BookThemeSettings["imageLayout"],
    coverDesign: storedCoverDesign,
    pageAdjustments: normalizePageAdjustments(fields.pageAdjustments),
    charactersPerPage: asNumber(fields.charactersPerPage, input.initialState.charactersPerPage),
    tableOfContentsItemsPerPage: asNumber(fields.tableOfContentsItemsPerPage, input.initialState.tableOfContentsItemsPerPage),
    visibility: asString(fields.visibility, input.initialState.visibility) as EditorDraftState["visibility"],
    status: asString(fields.status, input.initialState.status) as EditorDraftState["status"],
    slug:
      input.mode === "new"
        ? hasAnyDraftContent && !fromLanding
          ? asString(fields.slug, input.initialState.slug)
          : ""
        : hasAnyDraftContent
          ? asString(fields.slug, input.initialState.slug)
          : input.initialState.slug,
    authorHandle: asString(fields.authorHandle, input.initialState.authorHandle),
    authorBio: asString(fields.authorBio, input.initialState.authorBio),
    authorWebsiteUrl: asString(fields.authorWebsiteUrl, input.initialState.authorWebsiteUrl),
    authorXUrl: asString(fields.authorXUrl, input.initialState.authorXUrl),
    authorNoteUrl: asString(fields.authorNoteUrl, input.initialState.authorNoteUrl),
    externalLinkLabel: asString(fields.externalLinkLabel, input.initialState.externalLinkLabel),
    externalLinkUrl: asString(fields.externalLinkUrl, input.initialState.externalLinkUrl),
    externalSalesUrl: asString(fields.externalSalesUrl, input.initialState.externalSalesUrl),
    externalSalesLabel: asString(fields.externalSalesLabel, input.initialState.externalSalesLabel),
  };

  return {
    state: restoredState,
    images: draftImages,
    contentBlocks: draftBlocks.length ? draftBlocks : [{ id: "text-001", type: "text", content: rawText }],
    restored: hasAnyDraftContent,
  };
}
