"use client";

import Link from "next/link";
import { useParams, usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";

import { BETA_LIMITS } from "@/lib/limits";
import { publicBookBaseUrl } from "@/lib/promotion";
import {
  contentBlocksFromLegacy,
  contentBlocksToRawText,
  createColumnsBlock,
  createContentBlockId,
  ensureUniqueContentBlockIds,
  flattenContentBlocks,
  extractChaptersFromText,
  type BookContentBlock,
  type BookColumnChildBlock,
  type BookProject,
  type UploadedBookImage,
} from "@/lib/bookProject";
import {
  buildCanonicalBookPayload,
  canonicalAssetsToUploadedImages,
  canonicalContentBlocksToEditorBlocks,
  type CanonicalBookPayload,
} from "@/lib/canonicalBook";
import {
  CanonicalBookCommandError,
  previewCanonicalBookCommand,
  publishCanonicalBookCommand,
  saveCanonicalBookCommand,
} from "@/lib/commands/canonicalBookCommands";
import { importManuscriptFile } from "@/lib/fileImport";
import { useAuth } from "@/lib/auth/AuthContext";
import {
  getBook,
  listBooks,
  updatePublication,
  type CloudBookRecord,
} from "@/lib/bookRepository";
import {
  deleteAutosaveDraft,
  deleteDraft,
  deletePreviewReturnState,
  loadAutosaveDraft,
  loadDraft,
  loadPreviewReturnState,
  saveAutosaveDraft,
  savePreviewReturnState,
} from "@/lib/browserBookStorage";
import {
  deleteCanonicalPreview,
  loadCanonicalPreviewProject,
} from "@/lib/canonicalPreviewStorage";
import {
  isDisplayableImageUrl,
  isStorageReference,
  materializeBookProjectAssets,
} from "@/lib/bookAssetStorage";
import { normalizeSlugInput, validateSlug } from "@/lib/slug";
import { trackEvent } from "@/lib/analytics";
import { safeExternalUrl, type ExternalLink, type ThemeId } from "@/lib/productTypes";
import { localeLabels, SUPPORTED_LOCALES, type SupportedLocale } from "@/lib/localization";
import { contrastRatio, type BookThemeSettings } from "@/lib/themeSystem";
import { buildEditorDraftFields, seedFromDraftFields } from "@/lib/editorDraftState";
import {
  DEFAULT_COVER_DESIGN,
  normalizeCoverDesign,
  type CoverDesign,
} from "@/lib/coverDesign";
import {
  normalizePageAdjustments,
  removePageAdjustment,
  upsertPageAdjustment,
  type PageAdjustment,
} from "@/lib/pageAdjustments";
import { buildReaderPages, uniqueReaderPages } from "@/lib/paginateText";
import { documentStructureFromChapters } from "@/lib/documentStructure";
import { buildEditorGuidanceSnapshot } from "@/lib/editorGuidance/editorSnapshot";
import {
  evaluateEditorGuidance,
  selectVisibleEditorGuidance,
} from "@/lib/editorGuidance/editorRules";
import {
  resolveGuidanceNavigationTarget,
  resolveHelpBlockNavigationTarget,
  resolveReaderPageNavigationTarget,
  type EditorNavigationResult,
} from "@/lib/editorGuidance/editorNavigation";
import { getEditorHelpActionDefinition } from "@/lib/editorGuidance/actionRegistry";
import type { EditorGuidanceIssue } from "@/lib/editorGuidance/types";
import type { EditorHelpCatalogEntry } from "@/lib/editorGuidance/helpTypes";
import { resolveEditorHelpRoute } from "@/lib/editorGuidance/helpActions";
import {
  resolveBookyHelpState,
  type BookyHelpQueryState,
} from "@/lib/editorGuidance/bookyHelp";
import { smartFormatContentBlocks } from "@/lib/smartFormat";
import type { ImageManifestRow, ReaderPage } from "@/lib/types";
import { countContentCharacters } from "@/lib/characterCount";
import { validateRequiredBookFields } from "@/lib/editorValidation";
import { logSupabaseIssue } from "@/lib/supabaseDebug";
import { BookyHelpTrigger } from "@/components/BookyHelp";
import InlineManuscriptEditor from "@/components/InlineManuscriptEditor";
import type { InlineEditorHelpRequest } from "@/components/InlineManuscriptEditor";
import HomeBackLink from "@/components/HomeBackLink";
import Button from "@/components/ui/Button";
import ConnectSalesPanel from "@/components/ConnectSalesPanel";
import FormField from "@/components/ui/FormField";
import EditorMiniPreview from "@/components/EditorMiniPreview";
import EditorGuidanceCard from "@/components/EditorGuidanceCard";
import EditorHelpPanel from "@/components/EditorHelpPanel";

type EditorState = {
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
  coverDesign: CoverDesign;
  pageAdjustments: PageAdjustment[];
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
  publicationRevision?: number;
};

type DraftSeed = {
  state: EditorState;
  images: UploadedBookImage[];
  contentBlocks: BookContentBlock[];
  restored: boolean;
};

const SAVE_SUCCESS_MESSAGE = "保存しました。";
const SAVE_FAILURE_MESSAGE = "保存できませんでした。";
const SLUG_UNAVAILABLE_MESSAGE = "このURLは使用できません。";
const SLUG_AVAILABLE_MESSAGE = "このURLは使用できます。";

const INITIAL_EDITOR: EditorState = {
  title: "",
  subtitle: "",
  author: "",
  description: "",
  publisherName: "WebBookMaker",
  publishedAt: "",
  copyrightText: "",
  rawText: "",
  bindingDirection: "rtl",
  theme: "classic",
  language: "ja",
  fontFamily: "mincho",
  fontScale: "medium",
  lineHeight: "normal",
  marginScale: "standard",
  pageWidth: "standard",
  background: "paper",
  textColor: "#2f251d",
  accentColor: "#6bb9ad",
  coverStyle: "overlay",
  imageLayout: "framed",
  coverDesign: { ...DEFAULT_COVER_DESIGN },
  pageAdjustments: [],
  charactersPerPage: 380,
  tableOfContentsItemsPerPage: 6,
  visibility: "private",
  status: "draft",
  slug: "",
  authorHandle: "",
  authorBio: "",
  authorWebsiteUrl: "",
  authorXUrl: "",
  authorNoteUrl: "",
  externalLinkLabel: "",
  externalLinkUrl: "",
  externalSalesUrl: "",
  externalSalesLabel: "",
  publicationRevision: 1,
};

function normalizeEditorDraftSeed(seed: ReturnType<typeof seedFromDraftFields>): DraftSeed {
  return {
    ...seed,
    state: {
      ...INITIAL_EDITOR,
      ...seed.state,
      coverDesign: normalizeCoverDesign(seed.state.coverDesign),
      pageAdjustments: normalizePageAdjustments(seed.state.pageAdjustments),
    },
  };
}

function initialStateFromDraft(mode: "new" | "edit"): DraftSeed {
  if (mode !== "new" || typeof window === "undefined") {
    return {
      state: INITIAL_EDITOR,
      images: [],
      contentBlocks: [{ id: "text-001", type: "text", content: "" }],
      restored: false,
    };
  }
  const draft = loadDraft();
  if (draft?.fields && draft.fields.source !== "landing") {
    return {
      state: INITIAL_EDITOR,
      images: [],
      contentBlocks: [{ id: "text-001", type: "text", content: "" }],
      restored: false,
    };
  }
  return normalizeEditorDraftSeed(seedFromDraftFields({
    mode,
    initialState: INITIAL_EDITOR,
    fields: draft?.fields,
  }));
}

function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(reader.error ?? new Error("画像を読み込めませんでした。"));
    reader.readAsDataURL(file);
  });
}

function isImageFile(file: File) {
  const extension = file.name.toLowerCase().match(/\.[^.]+$/)?.[0] ?? "";
  return (
    BETA_LIMITS.allowedImageTypes.includes(file.type as never) &&
    BETA_LIMITS.allowedImageExtensions.includes(extension as never) &&
    file.size <= BETA_LIMITS.maxImageBytes
  );
}

function uploadedImagesFromBlocks(blocks: BookContentBlock[]): UploadedBookImage[] {
  const next: UploadedBookImage[] = [];
  const visit = (items: BookContentBlock[]) => {
    for (const block of items) {
      if (block.type === "columns") {
        visit([...block.left.blocks as BookContentBlock[], ...block.right.blocks as BookContentBlock[]]);
        continue;
      }
      if (block.type !== "image") continue;
      next.push({
        id: block.id,
        fileName: block.fileName,
        dataUrl: block.publicUrl || block.storagePath,
        storagePath: block.storagePath,
        displayUrl: block.publicUrl,
        mimeType: block.mimeType,
        size: 0,
        caption: block.caption || "",
        insertChapter: "1",
        orderInChapter: next.length + 1,
      });
    }
  };
  visit(blocks);
  return next;
}

function normalizeColorHex(value: string, fallback: string) {
  const trimmed = value.trim();
  if (!trimmed) return fallback;
  const prefixed = trimmed.startsWith("#") ? trimmed : `#${trimmed}`;
  const short = /^#([0-9a-fA-F]{3})$/.exec(prefixed);
  if (short) {
    const [r, g, b] = short[1].split("");
    return `#${r}${r}${g}${g}${b}${b}`.toLowerCase();
  }
  return /^#([0-9a-fA-F]{6})$/.test(prefixed) ? prefixed.toLowerCase() : fallback;
}

const BACKGROUND_HEX_BY_TYPE: Record<BookThemeSettings["background"], string> = {
  paper: "#fffaf0",
  ivory: "#f5efe2",
  cafe: "#f1e1cf",
  green: "#e8f0ea",
  night: "#1f2528",
  white: "#ffffff",
};

function ensureAaTextColor(textColor: string, background: BookThemeSettings["background"]) {
  const backgroundHex = BACKGROUND_HEX_BY_TYPE[background] || "#fffaf0";
  if (contrastRatio(textColor, backgroundHex) >= 4.5) return textColor;

  const dark = "#1f1f1f";
  const light = "#f5f1e8";
  const darkRatio = contrastRatio(dark, backgroundHex);
  const lightRatio = contrastRatio(light, backgroundHex);
  return darkRatio >= lightRatio ? dark : light;
}

function fromRecord(record: CloudBookRecord): EditorState {
  const coverStoragePath = record.bookProject.config.coverImage;
  return {
    title: record.title,
    subtitle: record.subtitle,
    author: record.authorName,
    description: record.description,
    publisherName: record.publisher,
    publishedAt: record.publishedAt,
    copyrightText: record.copyright,
    rawText: record.rawText,
    coverImage:
      record.bookProject.config.coverImageUrl ||
      (isDisplayableImageUrl(coverStoragePath) ? coverStoragePath : undefined),
    coverImageStoragePath: isStorageReference(coverStoragePath) ? coverStoragePath : undefined,
    coverFileName: record.coverPath ? "保存済み表紙" : undefined,
    bindingDirection: record.bindingDirection,
    theme: record.theme,
    language: record.bookProject.config.language,
    fontFamily: record.bookProject.config.themeSettings?.fontFamily || "mincho",
    fontScale: record.bookProject.config.themeSettings?.fontScale || "medium",
    lineHeight: record.bookProject.config.themeSettings?.lineHeight || "normal",
    marginScale: record.bookProject.config.themeSettings?.marginScale || "standard",
    pageWidth: record.bookProject.config.themeSettings?.pageWidth || "standard",
    background: record.bookProject.config.themeSettings?.background || "paper",
    textColor: record.bookProject.config.themeSettings?.textColor || "#2f251d",
    accentColor: record.bookProject.config.themeSettings?.accentColor || "#6bb9ad",
    coverStyle: record.bookProject.config.themeSettings?.coverStyle || "overlay",
    imageLayout: record.bookProject.config.themeSettings?.imageLayout || "framed",
    coverDesign: normalizeCoverDesign(record.bookProject.config.coverDesign),
    pageAdjustments: normalizePageAdjustments(record.bookProject.config.pageAdjustments),
    charactersPerPage: record.charactersPerPage,
    tableOfContentsItemsPerPage: record.tocItemsPerPage,
    visibility: record.visibility,
    status: record.status,
    slug: record.slug,
    authorHandle: record.authorHandle || record.bookProject.config.authorProfile?.handle || "",
    authorBio: record.bookProject.config.authorProfile?.bio || "",
    authorWebsiteUrl: record.bookProject.config.authorProfile?.websiteUrl || "",
    authorXUrl: record.bookProject.config.authorProfile?.snsLinks.find((link) => link.label === "X")?.url || "",
    authorNoteUrl: record.bookProject.config.authorProfile?.snsLinks.find((link) => link.type === "note")?.url || "",
    externalLinkLabel: record.bookProject.config.externalLinks?.[0]?.label || "",
    externalLinkUrl: record.bookProject.config.externalLinks?.[0]?.url || "",
    externalSalesUrl: record.bookProject.config.monetization?.externalSalesUrl || "",
    externalSalesLabel: record.bookProject.config.monetization?.externalSalesLabel || "",
  };
}

function imagesFromRecord(record: CloudBookRecord): UploadedBookImage[] {
  return record.bookProject.images.map((image, index) => ({
    id: image.image_id || image.image_index || `image-${index + 1}`,
    fileName: image.alt || image.source_path || `image-${index + 1}`,
    dataUrl: image.public_url || image.image_url,
    storagePath: image.storage_path || image.image_url,
    displayUrl: image.public_url,
    mimeType: (image.public_url || image.image_url).startsWith("data:image/png")
      ? "image/png"
      : (image.public_url || image.image_url).startsWith("data:image/webp")
        ? "image/webp"
        : "image/jpeg",
    size: 0,
    caption: image.caption,
    insertChapter: image.chapter_order ? String(image.chapter_order) : "",
    orderInChapter: index + 1,
  }));
}

function contentBlocksFromRecord(record: CloudBookRecord) {
  const storedBlocks = record.bookProject.contentBlocks;
  if (Array.isArray(storedBlocks) && storedBlocks.length) {
    return ensureUniqueContentBlockIds(storedBlocks);
  }
  return ensureUniqueContentBlockIds(contentBlocksFromLegacy(record.rawText, imagesFromRecord(record)));
}

function stateWithValidBlockAdjustments(state: EditorState, blocks: BookContentBlock[]) {
  const validIds = new Set(flattenContentBlocks(blocks).map((block) => block.id));
  return {
    ...state,
    pageAdjustments: normalizePageAdjustments(state.pageAdjustments).filter((adjustment) => validIds.has(adjustment.blockId)),
  };
}

function mergeRestoredImageBlocks(
  restoredBlocks: BookContentBlock[],
  persistedBlocks: BookContentBlock[],
) {
  const persistedImages = new Map(
    (() => {
      const images: Extract<BookContentBlock, { type: "image" }>[] = [];
      const collect = (blocks: BookContentBlock[]) => blocks.forEach((block) => {
        if (block.type === "image") images.push(block);
        else if (block.type === "columns") collect([...block.left.blocks as BookContentBlock[], ...block.right.blocks as BookContentBlock[]]);
      });
      collect(persistedBlocks);
      return images;
    })().map((block) => [block.id, block] as const),
  );
  const mergeBlock = (block: BookContentBlock): BookContentBlock | null => {
      if (block.type === "columns") {
        return {
          ...block,
          left: { blocks: block.left.blocks.map((child) => mergeBlock(child as BookContentBlock)).filter((child): child is BookColumnChildBlock => Boolean(child)) },
          right: { blocks: block.right.blocks.map((child) => mergeBlock(child as BookContentBlock)).filter((child): child is BookColumnChildBlock => Boolean(child)) },
        };
      }
      if (block.type !== "image") return block;
      const persisted = persistedImages.get(block.id);
      const displayUrl = isDisplayableImageUrl(block.publicUrl)
        ? block.publicUrl
        : persisted?.publicUrl;
      const storagePath = block.storagePath || persisted?.storagePath || "";
      return {
        ...block,
        storagePath,
        publicUrl: displayUrl,
      };
  };
  return restoredBlocks.map(mergeBlock).filter((block): block is BookContentBlock => Boolean(block)).filter((block) =>
      block.type !== "image"
      || block.uploadState === "pending"
      || block.uploadState === "error"
      || isDisplayableImageUrl(block.publicUrl),
    );
}

function mergeRestoredImages(
  restoredImages: UploadedBookImage[],
  persistedImages: UploadedBookImage[],
) {
  const persistedById = new Map(persistedImages.map((image) => [image.id, image]));
  return restoredImages.map((image) => {
    const persisted = persistedById.get(image.id);
    const displayUrl = isDisplayableImageUrl(image.displayUrl)
      ? image.displayUrl
      : persisted?.displayUrl;
    const dataUrl = isDisplayableImageUrl(image.dataUrl)
      ? image.dataUrl
      : displayUrl || persisted?.dataUrl || "";
    return {
      ...image,
      storagePath: image.storagePath || persisted?.storagePath,
      displayUrl,
      dataUrl,
    };
  });
}

function stateFromPreviewProject(project: BookProject): EditorState {
  const coverStoragePath = project.config.coverImage;
  return {
    ...INITIAL_EDITOR,
    title: project.config.title,
    subtitle: project.config.subtitle,
    author: project.config.author,
    description: project.config.description,
    publisherName: project.config.publisherName,
    publishedAt: project.config.publishedAt,
    copyrightText: project.config.copyrightText,
    rawText: project.rawText,
    coverImage:
      project.config.coverImageUrl ||
      (isDisplayableImageUrl(coverStoragePath) ? coverStoragePath : undefined),
    coverImageStoragePath: isStorageReference(coverStoragePath) ? coverStoragePath : undefined,
    bindingDirection: project.config.bindingDirection,
    theme: project.config.theme,
    language: project.config.language,
    fontFamily: project.config.themeSettings?.fontFamily || "mincho",
    fontScale: project.config.themeSettings?.fontScale || "medium",
    lineHeight: project.config.themeSettings?.lineHeight || "normal",
    marginScale: project.config.themeSettings?.marginScale || "standard",
    pageWidth: project.config.themeSettings?.pageWidth || "standard",
    background: project.config.themeSettings?.background || "paper",
    textColor: project.config.themeSettings?.textColor || "#2f251d",
    accentColor: project.config.themeSettings?.accentColor || "#6bb9ad",
    coverStyle: project.config.themeSettings?.coverStyle || "overlay",
    imageLayout: project.config.themeSettings?.imageLayout || "framed",
    coverDesign: normalizeCoverDesign(project.config.coverDesign),
    pageAdjustments: normalizePageAdjustments(project.config.pageAdjustments),
    charactersPerPage: project.config.charactersPerPage,
    tableOfContentsItemsPerPage: project.config.tableOfContentsItemsPerPage,
    // Preserve the user-entered slug through a Preview round trip. Legacy
    // previews without slug data must not silently become the fixed `book`
    // fallback (especially for non-Latin titles); let validation guide the
    // user instead.
    slug: project.config.slug || "",
    visibility: project.config.publication?.visibility || "private",
    status: project.config.publication?.status || "draft",
    authorHandle: project.config.authorProfile?.handle || "",
    authorBio: project.config.authorProfile?.bio || "",
    authorWebsiteUrl: project.config.authorProfile?.websiteUrl || "",
    authorXUrl: project.config.authorProfile?.snsLinks.find((link) => link.label === "X")?.url || "",
    authorNoteUrl: project.config.authorProfile?.snsLinks.find((link) => link.type === "note")?.url || "",
    externalLinkLabel: project.config.externalLinks?.[0]?.label || "",
    externalLinkUrl: project.config.externalLinks?.[0]?.url || "",
    externalSalesUrl: project.config.monetization?.externalSalesUrl || "",
    externalSalesLabel: project.config.monetization?.externalSalesLabel || "",
    publicationRevision: project.config.publicationRevision || 1,
  };
}

function imagesFromPreviewProject(project: BookProject): UploadedBookImage[] {
  return project.images.map((image, index) => ({
    id: image.image_id || image.image_index || `image-${index + 1}`,
    fileName: image.alt || image.source_path || `image-${index + 1}`,
    dataUrl: image.public_url || image.image_url,
    storagePath: image.storage_path || image.image_url,
    displayUrl: image.public_url,
    mimeType: (image.public_url || image.image_url).startsWith("data:image/png")
      ? "image/png"
      : (image.public_url || image.image_url).startsWith("data:image/webp")
        ? "image/webp"
        : "image/jpeg",
    size: 0,
    caption: image.caption,
    insertChapter: image.chapter_order ? String(image.chapter_order) : "",
    orderInChapter: index + 1,
  }));
}

function contentBlocksFromPreviewProject(project: BookProject) {
  if (Array.isArray(project.contentBlocks) && project.contentBlocks.length) {
    return project.contentBlocks;
  }
  return contentBlocksFromLegacy(project.rawText, imagesFromPreviewProject(project));
}

function buildPreviewReturnPath(pathname: string | null, draftId: string, mode: "new" | "edit", currentBookId?: string) {
  const basePath = pathname || (mode === "edit" && currentBookId ? `/dashboard/books/${currentBookId}/edit` : "/books/new");
  return `${basePath}?draftId=${encodeURIComponent(draftId)}`;
}

function removeDraftQuery(path: string) {
  const [pathname, query = ""] = path.split("?", 2);
  const params = new URLSearchParams(query);
  params.delete("draftId");
  const serialized = params.toString();
  return `${pathname}${serialized ? `?${serialized}` : ""}`;
}

export default function DashboardBookEditor({ mode }: { mode: "new" | "edit" }) {
  const [draftSeed] = useState(() => initialStateFromDraft(mode));
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const previewDraftId = searchParams.get("draftId") || "";
  const focusBlockId = searchParams.get("focusBlock") || "";
  const params = useParams<{ id?: string }>();
  const { user } = useAuth();
  const titleInputRef = useRef<HTMLInputElement | null>(null);
  const authorInputRef = useRef<HTMLInputElement | null>(null);
  const descriptionInputRef = useRef<HTMLTextAreaElement | null>(null);
  const authorHandleInputRef = useRef<HTMLInputElement | null>(null);
  const slugInputRef = useRef<HTMLInputElement | null>(null);
  const manuscriptInputRef = useRef<HTMLInputElement | null>(null);
  const coverInputRef = useRef<HTMLInputElement | null>(null);
  const helpTriggerRef = useRef<HTMLButtonElement | null>(null);
  const helpShouldReturnFocusRef = useRef(false);
  const manuscriptImportTargetRef = useRef<HTMLLabelElement | null>(null);
  const smartFormatTargetRef = useRef<HTMLButtonElement | null>(null);
  const smartUndoTargetRef = useRef<HTMLButtonElement | null>(null);
  const coverTargetRef = useRef<HTMLDivElement | null>(null);
  const headerActionsRef = useRef<HTMLDivElement | null>(null);
  const publishTargetRef = useRef<HTMLButtonElement | null>(null);
  const previewTargetRef = useRef<HTMLButtonElement | null>(null);
  const externalSalesTargetRef = useRef<HTMLInputElement | null>(null);
  const helpHighlightTimerRef = useRef<number | null>(null);
  const bookySuccessTimerRef = useRef<number | null>(null);
  const [bookId, setBookId] = useState<string | undefined>(params.id);
  const [state, setState] = useState<EditorState>(draftSeed.state);
  const [images, setImages] = useState<UploadedBookImage[]>(draftSeed.images);
  const [contentBlocks, setContentBlocks] = useState<BookContentBlock[]>(
    draftSeed.contentBlocks.length
      ? ensureUniqueContentBlockIds(draftSeed.contentBlocks)
      : [{ id: "text-001", type: "text", content: "" }],
  );
  const [helpOpen, setHelpOpen] = useState(false);
  const [bookyQueryState, setBookyQueryState] = useState<BookyHelpQueryState>("idle");
  const [bookyActionSuccess, setBookyActionSuccess] = useState(false);
  const [editorRevision, setEditorRevision] = useState(0);
  const [pendingImageCount, setPendingImageCount] = useState(0);
  const [stalePendingImageIds, setStalePendingImageIds] = useState<string[]>([]);
  const [pasteUndoBlocks, setPasteUndoBlocks] = useState<BookContentBlock[] | null>(null);
  const [smartFormatUndoBlocks, setSmartFormatUndoBlocks] = useState<BookContentBlock[] | null>(null);
  const [smartFormatSummary, setSmartFormatSummary] = useState<string | null>(null);
  const [cursorPosition, setCursorPosition] = useState(0);
  const [activeBlockId, setActiveBlockId] = useState<string | null>(null);
  const [editorScrollRequest, setEditorScrollRequest] = useState<{ blockId: string; nonce: number; highlight?: boolean } | null>(null);
  const [inlineHelpRequest, setInlineHelpRequest] = useState<InlineEditorHelpRequest | null>(null);
  const miniJumpNonceRef = useRef(0);
  const guidanceRequestNonceRef = useRef<number | null>(null);
  const handledFocusBlockRef = useRef<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [warnings, setWarnings] = useState<string[]>([]);
  const [statusMessage, setStatusMessage] = useState(
    draftSeed.restored ? "LPで入力した下書きを復元しました。続きから編集できます。" : "",
  );
  const [isLoading, setIsLoading] = useState(mode === "edit");
  const [isSaving, setIsSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [autosaveAt, setAutosaveAt] = useState<string | null>(null);
  const [requiredErrorMessage, setRequiredErrorMessage] = useState("");
  const [isHydrated, setIsHydrated] = useState(!previewDraftId);
  const [hasRestoredDraft, setHasRestoredDraft] = useState(!previewDraftId || draftSeed.restored);
  const [didRestorePreviewDraft, setDidRestorePreviewDraft] = useState(false);
  const [pendingScrollRestore, setPendingScrollRestore] = useState<number | null>(null);
  const [slugAvailabilityMessage, setSlugAvailabilityMessage] = useState("");
  const isMountedRef = useRef(true);
  const consumedPreviewDraftIdRef = useRef<string | null>(null);
  const restoredAutosaveKeyRef = useRef<string | null>(null);
  const statusMessageTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (statusMessageTimeoutRef.current !== null) {
        window.clearTimeout(statusMessageTimeoutRef.current);
      }
      if (helpHighlightTimerRef.current !== null) {
        window.clearTimeout(helpHighlightTimerRef.current);
      }
      if (bookySuccessTimerRef.current !== null) {
        window.clearTimeout(bookySuccessTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (helpOpen || !helpShouldReturnFocusRef.current) return;
    helpShouldReturnFocusRef.current = false;
    const focusTimer = window.setTimeout(() => helpTriggerRef.current?.focus(), 0);
    return () => window.clearTimeout(focusTimer);
  }, [helpOpen]);

  useEffect(() => {
    if (!previewDraftId) return;
    if (consumedPreviewDraftIdRef.current === previewDraftId) return;
    if (dirty) return;
    let active = true;
    consumedPreviewDraftIdRef.current = previewDraftId;
    const consumePreviewRestore = async () => {
      const returnState = loadPreviewReturnState(previewDraftId);
      const cleanCurrentPath = removeDraftQuery(
        pathname || (mode === "edit" && params.id ? `/dashboard/books/${params.id}/edit` : "/books/new"),
      );
      if (!returnState) {
        await deleteCanonicalPreview();
        if (active) {
          setHasRestoredDraft(true);
          setIsHydrated(true);
          router.replace(cleanCurrentPath, { scroll: false });
        }
        return;
      }

      const project = await loadCanonicalPreviewProject();
      if (!project || project.config.bookId !== previewDraftId) {
        await deleteCanonicalPreview();
        if (active) {
          setHasRestoredDraft(true);
          setIsHydrated(true);
          router.replace(cleanCurrentPath, { scroll: false });
        }
        return;
      }

      const materializedProject = await materializeBookProjectAssets(project);
      const restoredPreviewBlocks = ensureUniqueContentBlockIds(contentBlocksFromPreviewProject(materializedProject));
      setState(stateWithValidBlockAdjustments(stateFromPreviewProject(materializedProject), restoredPreviewBlocks));
      setBookId(materializedProject.config.bookId);
      setImages(imagesFromPreviewProject(materializedProject));
      setContentBlocks(restoredPreviewBlocks);
      setStalePendingImageIds(
        restoredPreviewBlocks
          .filter((block) => block.type === "image" && block.uploadState === "pending")
          .map((block) => block.id),
      );
      setEditorRevision((current) => current + 1);
      setDidRestorePreviewDraft(true);
      setPendingScrollRestore(returnState.scrollY);
      setStatusMessage("プレビュー前の編集内容を復元しました。");
      setIsLoading(false);

      // Consume the explicit preview return exactly once. The URL is cleaned
      // at the same time so a refresh cannot reapply the old project.
      deletePreviewReturnState(previewDraftId);
      await deleteCanonicalPreview();
      if (active) {
        setHasRestoredDraft(true);
        setIsHydrated(true);
        const returnTo = removeDraftQuery(returnState.returnTo);
        router.replace(returnTo, { scroll: false });
      }
    };

    void consumePreviewRestore()
      .catch(() => {
        if (active) {
          setHasRestoredDraft(true);
          setIsHydrated(true);
          setIsLoading(false);
          const cleanPath = removeDraftQuery(pathname || "/books/new");
          if (cleanPath !== pathname) router.replace(cleanPath, { scroll: false });
        }
      })
      .finally(() => {
        if (!active) return;
        setHasRestoredDraft(true);
        setIsHydrated(true);
      });
    return () => {
      active = false;
    };
  }, [dirty, mode, params.id, pathname, previewDraftId, router]);

  useEffect(() => {
    if (mode !== "edit" || !params.id || !user) return;
    // A valid preview return has already hydrated the editor state. Once the
    // query is cleaned, avoid refetching the same record and overwriting the
    // one-time restore notice with the generic load message.
    if (didRestorePreviewDraft && !previewDraftId) return;
    if (previewDraftId && !hasRestoredDraft) return;
    if (previewDraftId && didRestorePreviewDraft) return;
    let active = true;
    getBook(params.id, user.id)
      .then(async (book) => {
        if (!active) return;
        if (!book) {
          setStatusMessage("作品が見つからないか、アクセス権がありません。");
          setIsLoading(false);
          return;
        }
        const materializedProject = await materializeBookProjectAssets(book.bookProject);
        const materializedBook = { ...book, bookProject: materializedProject };
        if (!active) return;
        const persistedState = fromRecord(materializedBook);
        const persistedImages = imagesFromRecord(materializedBook);
        const persistedBlocks = contentBlocksFromRecord(materializedBook);
        const normalizedPersistedBlocks = ensureUniqueContentBlockIds(persistedBlocks);
        const autosave = loadAutosaveDraft(materializedBook.id, user.id);
        const persistedAt = Date.parse(materializedBook.updatedAt);
        const autosaveAtValue = autosave ? Date.parse(autosave.savedAt) : Number.NaN;
        const canRestoreAutosave = Boolean(
          autosave &&
            Number.isFinite(autosaveAtValue) &&
            Number.isFinite(persistedAt) &&
            autosaveAtValue > persistedAt,
        );

        if (canRestoreAutosave && autosave) {
          const restored = normalizeEditorDraftSeed(seedFromDraftFields({
            mode: "edit",
            initialState: persistedState,
            fields: autosave.fields,
          }));
          if (restored.restored) {
            const restoredBlocks = ensureUniqueContentBlockIds(mergeRestoredImageBlocks(restored.contentBlocks, normalizedPersistedBlocks));
            const restoredImages = restored.images.length
              ? mergeRestoredImages(restored.images, persistedImages)
              : persistedImages;
            setState(stateWithValidBlockAdjustments({
              ...restored.state,
              coverImage: isDisplayableImageUrl(restored.state.coverImage)
                ? restored.state.coverImage
                : persistedState.coverImage,
              coverImageStoragePath:
                restored.state.coverImageStoragePath || persistedState.coverImageStoragePath,
            }, restoredBlocks));
            setBookId(materializedBook.id);
            setImages(restoredImages);
            setContentBlocks(restoredBlocks.length ? restoredBlocks : normalizedPersistedBlocks);
            setStalePendingImageIds(
              flattenContentBlocks(restoredBlocks.length ? restoredBlocks : normalizedPersistedBlocks)
                .filter((block) => block.type === "image" && block.uploadState === "pending")
                .map((block) => block.id),
            );
            setAutosaveAt(autosave.savedAt);
            setDirty(true);
            setStatusMessage("前回の編集内容を復元しました。");
            setEditorRevision((current) => current + 1);
            return;
          }
        }

        setState(stateWithValidBlockAdjustments(persistedState, normalizedPersistedBlocks));
        setBookId(materializedBook.id);
        setImages(persistedImages);
        setContentBlocks(normalizedPersistedBlocks);
        setStalePendingImageIds(
          normalizedPersistedBlocks.filter((block) => block.type === "image" && block.uploadState === "pending").map((block) => block.id),
        );
        setAutosaveAt(null);
        setEditorRevision((current) => current + 1);
        setStatusMessage("作品を読み込みました。");
      })
      .catch(() => {
        if (active) {
          setStatusMessage("作品を読み込めませんでした。");
        }
      })
      .finally(() => {
        if (active) {
          setIsLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, [didRestorePreviewDraft, hasRestoredDraft, mode, params.id, previewDraftId, user]);

  useEffect(() => {
    if (
      mode !== "new" ||
      !user ||
      previewDraftId ||
      draftSeed.restored ||
      didRestorePreviewDraft ||
      restoredAutosaveKeyRef.current === "new"
    ) {
      return;
    }
    restoredAutosaveKeyRef.current = "new";
    const autosave = loadAutosaveDraft(null, user.id);
    if (!autosave) return;
    const restored = normalizeEditorDraftSeed(seedFromDraftFields({
      mode: "new",
      initialState: INITIAL_EDITOR,
      fields: autosave.fields,
    }));
    if (!restored.restored) return;
    const restoreTimer = window.setTimeout(() => {
      setImages(restored.images);
      const restoredBlocks = ensureUniqueContentBlockIds(restored.contentBlocks);
      setState(stateWithValidBlockAdjustments(restored.state, restoredBlocks));
      setContentBlocks(restoredBlocks);
      setStalePendingImageIds(
        restoredBlocks
          .filter((block) => block.type === "image" && block.uploadState === "pending")
          .map((block) => block.id),
      );
      setAutosaveAt(autosave.savedAt);
      setDirty(true);
      setHasRestoredDraft(true);
      setIsHydrated(true);
      setStatusMessage("前回の編集内容を復元しました。");
      setEditorRevision((current) => current + 1);
    }, 0);
    return () => window.clearTimeout(restoreTimer);
  }, [didRestorePreviewDraft, draftSeed.restored, mode, previewDraftId, user]);

  useEffect(() => {
    if (pendingScrollRestore === null) return;
    if (!isHydrated || !hasRestoredDraft) return;
    let cancelled = false;
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        if (cancelled) return;
        window.scrollTo({ top: pendingScrollRestore, behavior: "auto" });
        setPendingScrollRestore(null);
      });
    });
    return () => {
      cancelled = true;
    };
  }, [editorRevision, hasRestoredDraft, isHydrated, pendingScrollRestore]);

  useEffect(() => {
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!dirty) return;
      event.preventDefault();
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  const colorContrast = useMemo(
    () => contrastRatio(state.textColor, state.background === "night" ? "#1f2528" : "#fffaf0"),
    [state.background, state.textColor],
  );
  const slugFormatError = useMemo(() => {
    if (!state.slug.trim()) return "";
    return validateSlug(state.slug);
  }, [state.slug]);
  const publicBooksBaseUrl = useMemo(() => publicBookBaseUrl(), []);

  const deferredContentBlocks = useDeferredValue(contentBlocks);
  const miniPreviewModel = useMemo(() => {
    const rawText = contentBlocksToRawText(deferredContentBlocks);
    const chapters = extractChaptersFromText(rawText, state.title || "本文", deferredContentBlocks);
    const imageRows: ImageManifestRow[] = flattenContentBlocks(deferredContentBlocks)
      .filter((block): block is Extract<BookContentBlock, { type: "image" }> => block.type === "image")
      .map((block) => ({
        chapter_order: 1,
        chapter_title: state.title || "本文",
        image_index: block.id,
        image_id: block.id,
        image_url: block.publicUrl || block.storagePath,
        storage_path: block.storagePath,
        public_url: block.publicUrl,
        alt: block.altText || block.fileName,
        caption: block.caption || "",
        source_path: block.fileName,
        local_path: "",
      }));
    const logicalPages = buildReaderPages({
      chapters,
      images: imageRows,
      contentBlocks: deferredContentBlocks,
      pageAdjustments: state.pageAdjustments,
      charactersPerPage: Math.max(180, Number(state.charactersPerPage) || 380),
      tableOfContentsItemsPerPage: state.tableOfContentsItemsPerPage,
      showPaywallPage: true,
    });
    // buildReaderPages applies canonical page-break adjustments directly. Do
    // not add synthetic blank pages here; the mini preview must mirror Reader.
    // Both Reader and Mini Preview consume this single, ID-unique page set;
    // never append the previous render's pages during editor updates.
    const uniquePages = uniqueReaderPages(logicalPages);
    return {
      logicalPages: uniquePages,
      pages: uniquePages,
      documentStructure: documentStructureFromChapters(chapters),
    };
  }, [deferredContentBlocks, state.charactersPerPage, state.pageAdjustments, state.tableOfContentsItemsPerPage, state.title]);
  const miniPreviewPages = miniPreviewModel.pages;
  const miniPreviewLogicalPages = miniPreviewModel.logicalPages;

  const handleMiniPageClick = useCallback((page: ReaderPage) => {
    const targetBlockId = resolveReaderPageNavigationTarget(
      page,
      miniPreviewPages,
      contentBlocks,
    );
    if (!targetBlockId) return;
    miniJumpNonceRef.current += 1;
    setEditorScrollRequest({ blockId: targetBlockId, nonce: miniJumpNonceRef.current, highlight: false });
  }, [contentBlocks, miniPreviewPages]);

  const handleGuidanceAction = useCallback((issue: EditorGuidanceIssue) => {
    const resolution = resolveGuidanceNavigationTarget(
      issue,
      miniPreviewLogicalPages,
      contentBlocks,
    );
    if (resolution.status === "unavailable") return;
    if (resolution.status === "not-found") {
      setStatusMessage("該当箇所はすでに変更されています。");
      return;
    }
    miniJumpNonceRef.current += 1;
    guidanceRequestNonceRef.current = miniJumpNonceRef.current;
    setEditorScrollRequest({
      blockId: resolution.blockId,
      nonce: miniJumpNonceRef.current,
      highlight: true,
    });
  }, [contentBlocks, miniPreviewLogicalPages]);

  const handleEditorScrollRequestResult = useCallback((result: { nonce: number; status: "handled" | "not-found" }) => {
    if (guidanceRequestNonceRef.current !== result.nonce) return;
    guidanceRequestNonceRef.current = null;
    setStatusMessage(
      result.status === "handled"
        ? "該当箇所を編集画面に表示しました。"
        : "該当箇所はすでに変更されています。",
    );
  }, []);

  useEffect(() => {
    if (isLoading || !focusBlockId || handledFocusBlockRef.current === focusBlockId) return;
    const exists = flattenContentBlocks(contentBlocks).some((block) => block.id === focusBlockId);
    handledFocusBlockRef.current = focusBlockId;
    if (!exists) {
      window.setTimeout(() => setStatusMessage("該当箇所はすでに変更されています。"), 0);
      return;
    }
    miniJumpNonceRef.current += 1;
    guidanceRequestNonceRef.current = miniJumpNonceRef.current;
    setEditorScrollRequest({ blockId: focusBlockId, nonce: miniJumpNonceRef.current, highlight: true });
  }, [contentBlocks, focusBlockId, isLoading]);

  const handleCursorChange = useCallback((position: number, blockId: string | null) => {
    setCursorPosition(position);
    setActiveBlockId(blockId);
  }, []);

  const pageBreakAfterBlockIds = useMemo(
    () => state.pageAdjustments.filter((adjustment) => adjustment.pageBreakAfter).map((adjustment) => adjustment.blockId),
    [state.pageAdjustments],
  );

  const handleEditorInsertPageBreak = useCallback((blockId: string) => {
    setState((current) => ({
      ...current,
      pageAdjustments: upsertPageAdjustment(current.pageAdjustments, blockId, { pageBreakAfter: true }),
    }));
    setDirty(true);
  }, []);

  const handleEditorRemovePageBreak = useCallback((blockId: string) => {
    setState((current) => {
      const adjustment = current.pageAdjustments.find((item) => item.blockId === blockId);
      if (!adjustment) return current;
      const remaining = Object.entries(adjustment).filter(([key, value]) => key !== "blockId" && key !== "pageBreakAfter" && value !== undefined);
      const nextAdjustments = remaining.length
        ? upsertPageAdjustment(current.pageAdjustments, blockId, { pageBreakAfter: undefined })
        : removePageAdjustment(current.pageAdjustments, blockId);
      return { ...current, pageAdjustments: nextAdjustments };
    });
    setDirty(true);
  }, []);

  const handleEditorInsertPaywall = useCallback(() => {
    setContentBlocks((current) => {
      if (current.some((block) => block.type === "paywall")) return current;
      const index = activeBlockId ? current.findIndex((block) => block.id === activeBlockId) : -1;
      const next = [...current];
      next.splice(index >= 0 ? index + 1 : next.length, 0, { id: createContentBlockId("paywall"), type: "paywall" });
      setImages(uploadedImagesFromBlocks(next));
      setState((state) => ({ ...state, rawText: contentBlocksToRawText(next) }));
      setDirty(true);
      return next;
    });
    // Paywall insertion is an external structural change. Force the inline
    // editor to render it immediately; ordinary text edits intentionally keep
    // the existing DOM to preserve the caret.
    setEditorRevision((current) => current + 1);
    setStatusMessage("有料境界を追加しました。クリックすると削除できます。");
  }, [activeBlockId]);

  const handleEditorRemovePaywall = useCallback((blockId: string) => {
    if (!blockId) return;
    setContentBlocks((current) => {
      const next = current.filter((block) => block.id !== blockId);
      setImages(uploadedImagesFromBlocks(next));
      setState((state) => ({ ...state, rawText: contentBlocksToRawText(next) }));
      setDirty(true);
      return next;
    });
    setEditorRevision((current) => current + 1);
    setStatusMessage("有料境界を削除しました。");
  }, []);

  const handleEditorInsertColumns = useCallback(() => {
    setContentBlocks((current) => {
      const columns = createColumnsBlock();
      const index = activeBlockId ? current.findIndex((block) => block.id === activeBlockId) : -1;
      const next = [...current];
      next.splice(index >= 0 ? index + 1 : next.length, 0, columns);
      setImages(uploadedImagesFromBlocks(next));
      setState((state) => ({ ...state, rawText: contentBlocksToRawText(next) }));
      setDirty(true);
      return next;
    });
    setEditorRevision((current) => current + 1);
    setStatusMessage("2カラムを挿入しました。左右の本文を編集できます。");
  }, [activeBlockId]);

  const activeMiniPageId = useMemo(() => {
    if (!activeBlockId) return null;
    return miniPreviewPages.find((page) => "sourceBlockIds" in page && page.sourceBlockIds?.includes(activeBlockId))?.id || null;
  }, [activeBlockId, miniPreviewPages]);

  const bodyCharacterCount = useMemo(() => countContentCharacters(contentBlocks), [contentBlocks]);
  const deferredBodyCharacterCount = useDeferredValue(bodyCharacterCount);
  const bodyCharacterPercentage = bodyCharacterCount ? Math.round((cursorPosition / bodyCharacterCount) * 100) : 0;

  const estimatedPages = useMemo(() => {
    const charsPerPage = Math.max(180, Number(state.charactersPerPage) || 380);
    const paginationBlocks = flattenContentBlocks(contentBlocks);
    const characterCount = paginationBlocks
      .filter((block): block is Extract<BookContentBlock, { type: "text" }> => block.type === "text")
      .reduce((sum, block) => sum + block.content.trim().length, 0);
    const imagePages = paginationBlocks.filter((block) => block.type === "image" && block.pageMode !== "inline").length;
    const videoPages = paginationBlocks.filter((block) => block.type === "youtube" && block.displayMode !== "inline").length;
    const textPages = characterCount ? Math.max(1, Math.ceil(characterCount / charsPerPage)) : 0;
    return textPages + imagePages + videoPages;
  }, [contentBlocks, state.charactersPerPage]);

  const textPages = useMemo(() => {
    const charsPerPage = Math.max(180, Number(state.charactersPerPage) || 380);
    const characterCount = flattenContentBlocks(contentBlocks)
      .filter((block): block is Extract<BookContentBlock, { type: "text" }> => block.type === "text")
      .reduce((sum, block) => sum + block.content.trim().length, 0);
    return characterCount ? Math.max(1, Math.ceil(characterCount / charsPerPage)) : 0;
  }, [contentBlocks, state.charactersPerPage]);

  const imagePages = useMemo(() => flattenContentBlocks(contentBlocks).filter((block) => block.type === "image").length, [contentBlocks]);

  const editorGuidanceSnapshot = useMemo(
    () => buildEditorGuidanceSnapshot({
      title: state.title,
      contentBlocks: deferredContentBlocks,
      documentStructure: miniPreviewModel.documentStructure,
      readerPages: miniPreviewLogicalPages,
      bodyCharacterCount: deferredBodyCharacterCount,
      charactersPerPage: state.charactersPerPage,
    }),
    [
      deferredBodyCharacterCount,
      deferredContentBlocks,
      miniPreviewLogicalPages,
      miniPreviewModel.documentStructure,
      state.charactersPerPage,
      state.title,
    ],
  );
  const visibleEditorGuidance = useMemo(
    () => selectVisibleEditorGuidance(evaluateEditorGuidance(editorGuidanceSnapshot)),
    [editorGuidanceSnapshot],
  );
  const bookyState = useMemo(
    () => resolveBookyHelpState({
      helpOpen,
      queryState: bookyQueryState,
      actionSuccess: bookyActionSuccess,
      hasGuidance: visibleEditorGuidance.length > 0,
    }),
    [bookyActionSuccess, bookyQueryState, helpOpen, visibleEditorGuidance.length],
  );

  const autosaveDraftFields = useMemo(
    () =>
      buildEditorDraftFields({
        mode,
        state,
        contentBlocks,
        images,
        draftId: bookId || "new-draft",
      }),
    [bookId, contentBlocks, images, mode, state],
  );

  const autosaveLabel = useMemo(() => {
    if (!autosaveAt) return "未保存";
    const dt = new Date(autosaveAt);
    if (Number.isNaN(dt.getTime())) return "未保存";
    const hh = String(dt.getHours()).padStart(2, "0");
    const mm = String(dt.getMinutes()).padStart(2, "0");
    const ss = String(dt.getSeconds()).padStart(2, "0");
    return `${hh}:${mm}:${ss}`;
  }, [autosaveAt]);

  useEffect(() => {
    if (!user) return;
    if (!dirty) return;
    if (!isHydrated || !hasRestoredDraft) return;
    if (mode === "edit" && isLoading) return;
    const targetBookId = mode === "edit" ? bookId || params.id || null : null;
    const timeoutId = window.setTimeout(() => {
      const saved = saveAutosaveDraft({
        bookId: targetBookId,
        userId: user.id,
        fields: autosaveDraftFields,
      });
      if (!saved) return;
      setAutosaveAt(saved.savedAt);
    }, 900);
    return () => window.clearTimeout(timeoutId);
  }, [autosaveDraftFields, bookId, dirty, hasRestoredDraft, isHydrated, isLoading, mode, params.id, user]);

  const validateRequiredBeforeAction = () => {
    const validation = validateRequiredBookFields({
      title: state.title,
      authorName: state.author,
      description: state.description,
      authorHandle: state.authorHandle,
      slug: state.slug,
    });

    setErrors((current) => {
      const next = { ...current };
      (['title', 'author', 'description', 'authorHandle', 'slug'] as const).forEach((key) => {
        const message = validation.fieldErrors[key];
        if (message) {
          next[key] = message;
        } else {
          delete next[key];
        }
      });
      return next;
    });

    setRequiredErrorMessage(validation.globalError);
    if (validation.isValid) return true;

    const firstMissing = {
      title: titleInputRef.current,
      author: authorInputRef.current,
      description: descriptionInputRef.current,
      authorHandle: authorHandleInputRef.current,
      slug: slugInputRef.current,
    }[validation.firstMissingField || "slug"];
    firstMissing?.scrollIntoView({ behavior: "smooth", block: "center" });
    firstMissing?.focus({ preventScroll: true });
    return false;
  };

  const update = <K extends keyof EditorState>(key: K, value: EditorState[K]) => {
    setState((current) => {
      const next = {
        ...current,
        [key]: value,
      };
      if (key === "background") {
        next.textColor = ensureAaTextColor(next.textColor, next.background);
      }
      return next;
    });

    if (key === "slug") {
      const requiredKey = "slug" as const;
      const nextRequiredState = {
        ...state,
        [key]: value,
      };
      const validation = validateRequiredBookFields({
        title: nextRequiredState.title,
        authorName: nextRequiredState.author,
        description: nextRequiredState.description,
        authorHandle: nextRequiredState.authorHandle,
        slug: nextRequiredState.slug,
      });
      setErrors((current) => {
        const next = { ...current };
        const message = validation.fieldErrors[requiredKey];
        if (message) {
          next[requiredKey] = message;
        } else {
          delete next[requiredKey];
        }
        return next;
      });
      setRequiredErrorMessage(validation.globalError);
    }
    if (key === "slug") {
      setSlugAvailabilityMessage("");
    }
    setDirty(true);
  };

  const showTemporaryStatusMessage = (message: string, durationMs = 2000) => {
    if (statusMessageTimeoutRef.current !== null) {
      window.clearTimeout(statusMessageTimeoutRef.current);
      statusMessageTimeoutRef.current = null;
    }
    setStatusMessage(message);
    statusMessageTimeoutRef.current = window.setTimeout(() => {
      if (!isMountedRef.current) return;
      setStatusMessage((current) => (current === message ? "" : current));
      statusMessageTimeoutRef.current = null;
    }, durationMs);
  };

  const updateColor = (key: "textColor" | "accentColor", value: string) => {
    if (key === "textColor") {
      setState((current) => {
        const normalized = normalizeColorHex(value, current.textColor);
        return {
          ...current,
          textColor: ensureAaTextColor(normalized, current.background),
        };
      });
      setDirty(true);
      return;
    }
    update("accentColor", normalizeColorHex(value, state.accentColor));
  };

  useEffect(() => {
    if (!user) return;
    if (!state.slug.trim()) return;

    const formatError = validateSlug(state.slug);
    if (formatError) return;
    const normalizedSlug = normalizeSlugInput(state.slug || "");

    let active = true;
    const timeoutId = window.setTimeout(() => {
      listBooks(user.id)
        .then((books) => {
          if (!active) return;
          const conflict = books.some((book) => book.slug === normalizedSlug && book.id !== bookId);
          setSlugAvailabilityMessage(conflict ? "" : SLUG_AVAILABLE_MESSAGE);
          setErrors((current) => {
            const next = { ...current };
            if (conflict) {
              next.slug = SLUG_UNAVAILABLE_MESSAGE;
            } else if (next.slug === SLUG_UNAVAILABLE_MESSAGE || next.slug === formatError) {
              delete next.slug;
            }
            return next;
          });
        })
        .catch(() => {
          // Keep editing available even if availability check fails.
        });
    }, 320);

    return () => {
      active = false;
      window.clearTimeout(timeoutId);
    };
  }, [bookId, state.slug, user]);

  const syncContentBlocks = (nextBlocks: BookContentBlock[]) => {
    const normalizedBlocks = ensureUniqueContentBlockIds(nextBlocks);
    setContentBlocks(normalizedBlocks);
    setImages(uploadedImagesFromBlocks(normalizedBlocks));
    setState((current) => ({ ...current, rawText: contentBlocksToRawText(normalizedBlocks) }));
    setDirty(true);
  };

  const applyImportedContent = (nextBlocks: BookContentBlock[]) => {
    syncContentBlocks(nextBlocks);
    setEditorRevision((current) => current + 1);
  };

  const handlePasteUndo = () => {
    if (!pasteUndoBlocks) return;
    syncContentBlocks(pasteUndoBlocks);
    setPasteUndoBlocks(null);
    setEditorRevision((current) => current + 1);
    setStatusMessage("貼り付け前の原稿へ戻しました");
  };

  const handleSmartFormat = () => {
    if (!contentBlocks.length) return;
    const result = smartFormatContentBlocks(contentBlocks);
    setSmartFormatUndoBlocks(contentBlocks);
    syncContentBlocks(result.blocks);
    setEditorRevision((current) => current + 1);
    setSmartFormatSummary(`章：${result.chapters}　小見出し：${result.subheadings}　段落：${result.paragraphs}`);
    setStatusMessage("文章の内容は変更せず、Webブック向けに整えました。");
  };

  const handleSmartFormatUndo = () => {
    if (!smartFormatUndoBlocks) return;
    syncContentBlocks(smartFormatUndoBlocks);
    setSmartFormatUndoBlocks(null);
    setSmartFormatSummary(null);
    setEditorRevision((current) => current + 1);
    setStatusMessage("自動整形前の原稿へ戻しました。");
  };

  const buildCanonicalPayload = (): CanonicalBookPayload | null => {
    const externalUrl = safeExternalUrl(state.externalLinkUrl);
    const externalLinks = externalUrl
      ? ([
          {
            id: "creator-link-1",
            type: "other",
            label: state.externalLinkLabel || "外部リンク",
            url: externalUrl,
          },
        ] satisfies ExternalLink[])
      : [];
    const result = buildCanonicalBookPayload({
      state,
      contentBlocks,
      images,
      bookId,
      externalLinks,
    });
    if (!result.ok) {
      setErrors(result.errors);
      return null;
    }
    if (errors.slug === SLUG_UNAVAILABLE_MESSAGE) {
      setErrors((current) => ({ ...current, slug: SLUG_UNAVAILABLE_MESSAGE }));
      return null;
    }
    const slugError = state.slug ? validateSlug(state.slug) : "";
    if (slugError) {
      setErrors({ slug: slugError });
      return null;
    }
    setErrors({});
    return result.payload;
  };

  const replaceEditorStateFromCanonicalPayload = (payload: CanonicalBookPayload) => {
    const nextBlocks = canonicalContentBlocksToEditorBlocks(payload);
    const nextImages = canonicalAssetsToUploadedImages(payload);
    setState((current) => ({
      ...current,
      title: payload.title,
      subtitle: payload.subtitle,
      author: payload.authorName,
      description: payload.description,
      publisherName: payload.publisherName,
      publishedAt: payload.publishedAt,
      copyrightText: payload.copyrightText,
      rawText: contentBlocksToRawText(nextBlocks),
      coverImage: payload.coverAsset?.localPreviewUrl || payload.coverAsset?.storagePath,
      coverImageStoragePath: payload.coverAsset?.storagePath,
      coverFileName: payload.coverAsset?.fileName,
      bindingDirection: payload.bindingDirection,
      theme: payload.theme,
      language: payload.language,
      fontFamily: payload.themeSettings.fontFamily || current.fontFamily,
      fontScale: payload.themeSettings.fontScale || current.fontScale,
      lineHeight: payload.themeSettings.lineHeight || current.lineHeight,
      marginScale: payload.themeSettings.marginScale || current.marginScale,
      pageWidth: payload.themeSettings.pageWidth || current.pageWidth,
      background: payload.themeSettings.background || current.background,
      textColor: payload.themeSettings.textColor || current.textColor,
      accentColor: payload.themeSettings.accentColor || current.accentColor,
      coverStyle: payload.themeSettings.coverStyle || current.coverStyle,
      imageLayout: payload.themeSettings.imageLayout || current.imageLayout,
      coverDesign: normalizeCoverDesign(payload.coverDesign),
      pageAdjustments: normalizePageAdjustments(payload.pageAdjustments),
      charactersPerPage: payload.charactersPerPage,
      tableOfContentsItemsPerPage: payload.tableOfContentsItemsPerPage,
      visibility: payload.publication.visibility,
      status: payload.publication.status,
      slug: payload.slug,
      authorHandle: payload.authorHandle,
      authorBio: payload.authorBio,
      authorWebsiteUrl: payload.authorWebsiteUrl,
      authorXUrl: payload.authorXUrl,
      authorNoteUrl: payload.authorNoteUrl,
      externalLinkLabel: payload.externalLinks[0]?.label || current.externalLinkLabel,
      externalLinkUrl: payload.externalLinks[0]?.url || current.externalLinkUrl,
      externalSalesUrl: payload.externalSalesUrl,
      externalSalesLabel: payload.externalSalesLabel,
      publicationRevision: payload.publicationRevision || current.publicationRevision || 1,
    }));
    setImages(nextImages);
    setContentBlocks(ensureUniqueContentBlockIds(nextBlocks));
    setBookId(payload.bookId);
    setEditorRevision((current) => current + 1);
  };

  const handleImport = async (file?: File) => {
    if (!file) return;
    if (state.rawText && !window.confirm("現在の本文を読み込みファイルで上書きします。よろしいですか？")) {
      if (manuscriptInputRef.current) manuscriptInputRef.current.value = "";
      return;
    }
    try {
      const imported = await importManuscriptFile(file);
      const nextRawText = imported.text;
      setState((current) => ({
        ...current,
        rawText: nextRawText,
        title: current.title || imported.title || current.title,
        description: current.description || imported.description || current.description,
      }));
      const nextBlocks = contentBlocksFromLegacy(nextRawText, []);
      applyImportedContent(nextBlocks);
      setWarnings(imported.warnings);
      setStatusMessage(`${file.name} を読み込みました。`);
      setDirty(true);
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "ファイルを読み込めませんでした。");
    } finally {
      if (manuscriptInputRef.current) manuscriptInputRef.current.value = "";
    }
  };

  const handleCover = async (file?: File) => {
    if (!file) return;
    if (!isImageFile(file)) {
      setStatusMessage("表紙画像はJPEG / PNG / WebP、10MBまでです。SVGは利用できません。");
      return;
    }
    update("coverImage", await fileToDataUrl(file));
    update("coverImageStoragePath", undefined);
    update("coverFileName", file.name);
    if (coverInputRef.current) coverInputRef.current.value = "";
  };

  const clearAutosaveAfterFormalPersistence = (persistedBookId?: string) => {
    if (mode === "new") {
      deleteAutosaveDraft(null);
    } else {
      deleteAutosaveDraft(bookId || params.id || null);
    }
    if (persistedBookId) deleteAutosaveDraft(persistedBookId);
    setAutosaveAt(null);
  };

  const handleCanonicalSave = async () => {
    if (!user || isSaving) return null;
    if (!validateRequiredBeforeAction()) return null;
    if (pendingImageCount > 0) {
      setStatusMessage("画像の読み込みが完了するまで保存できません。");
      return null;
    }
    const payload = buildCanonicalPayload();
    if (!payload) return null;

    setIsSaving(true);
    try {
      const saved = await saveCanonicalBookCommand(payload, user.id);
      if (!isMountedRef.current) return saved;
      replaceEditorStateFromCanonicalPayload(saved.project);
      setDirty(false);
      clearAutosaveAfterFormalPersistence(saved.bookId);
      setSlugAvailabilityMessage(saved.project.slug ? SLUG_AVAILABLE_MESSAGE : "");
      showTemporaryStatusMessage(SAVE_SUCCESS_MESSAGE);
      trackEvent("book_saved", { bookId: saved.bookId });
      if (mode === "new" || didRestorePreviewDraft) deleteDraft();
      if (didRestorePreviewDraft || previewDraftId) {
        deletePreviewReturnState(previewDraftId || undefined);
        await deleteCanonicalPreview();
      }
      if (mode === "new" || saved.bookId !== (bookId || params.id)) {
        router.replace(`/dashboard/books/${saved.bookId}/edit`);
      }
      return saved;
    } catch (error) {
      if (error instanceof CanonicalBookCommandError && error.fieldErrors) {
        setErrors(error.fieldErrors);
      }
      logSupabaseIssue({
        processingName: "saveCanonicalBookCommand",
        target: "books / book_images / book_external_links / book-assets",
        error,
        context: { mode, bookId: bookId || params.id || null },
      });
      if (isMountedRef.current) {
        setStatusMessage(
          error instanceof CanonicalBookCommandError && error.message
            ? error.message
            : SAVE_FAILURE_MESSAGE,
        );
      }
      return null;
    } finally {
      if (isMountedRef.current) setIsSaving(false);
    }
  };

  const handleCanonicalPreview = async () => {
    if (!validateRequiredBeforeAction()) return;
    if (pendingImageCount > 0) {
      setStatusMessage("画像の読み込みが完了するまでプレビューできません。");
      return;
    }
    const payload = buildCanonicalPayload();
    if (!payload) return;
    try {
      const previewed = await previewCanonicalBookCommand(payload);
      const returnTo = buildPreviewReturnPath(pathname, previewed.previewId, mode, bookId || params.id);
      savePreviewReturnState({
        draftId: previewed.previewId,
        returnTo,
        scrollY: window.scrollY,
      });
      router.push(
        `/reader?mode=preview&from=dashboard&draftId=${encodeURIComponent(previewed.previewId)}&returnTo=${encodeURIComponent(returnTo)}`,
      );
    } catch (error) {
      if (error instanceof CanonicalBookCommandError && error.fieldErrors) setErrors(error.fieldErrors);
      logSupabaseIssue({
        processingName: "previewCanonicalBookCommand",
        target: "preview",
        error,
        context: { mode, bookId: bookId || params.id || null },
      });
      setStatusMessage("プレビューを作成できませんでした。");
    }
  };

  const handleCanonicalPublish = async () => {
    if (!user || isSaving) return;
    if (!validateRequiredBeforeAction()) return;
    if (pendingImageCount > 0) {
      setStatusMessage("画像の読み込みが完了するまで公開できません。");
      return;
    }
    const payload = buildCanonicalPayload();
    if (!payload) return;

    setIsSaving(true);
    try {
      const published = await publishCanonicalBookCommand(payload, user.id);
      if (!isMountedRef.current) return;
      replaceEditorStateFromCanonicalPayload(published.project);
      setDirty(false);
      clearAutosaveAfterFormalPersistence(published.bookId);
      if (mode === "new" || didRestorePreviewDraft) deleteDraft();
      if (didRestorePreviewDraft || previewDraftId) {
        deletePreviewReturnState(previewDraftId || undefined);
        await deleteCanonicalPreview();
      }
      setStatusMessage(`公開しました: ${published.publicUrl}`);
      trackEvent("book_published", { bookId: published.bookId });
    } catch (error) {
      if (error instanceof CanonicalBookCommandError && error.fieldErrors) setErrors(error.fieldErrors);
      logSupabaseIssue({
        processingName: "publishCanonicalBookCommand",
        target: "books / book_images / book_external_links / book-assets",
        error,
        context: { mode, bookId: bookId || params.id || null },
      });
      setStatusMessage(
        error instanceof CanonicalBookCommandError && error.message
          ? error.message
          : "保存に失敗したため公開できませんでした。",
      );
    } finally {
      if (isMountedRef.current) setIsSaving(false);
    }
  };

  const unpublish = async () => {
    if (!user || !bookId) return;
    const record = await updatePublication(bookId, user.id, { status: "draft", visibility: "private" });
    setState((current) => ({ ...current, status: record.status, visibility: record.visibility }));
    setStatusMessage("公開を停止しました。");
  };

  const closeHelp = useCallback(() => {
    helpShouldReturnFocusRef.current = true;
    setBookyQueryState("idle");
    setHelpOpen(false);
  }, []);

  const openHelp = useCallback(() => {
    if (bookySuccessTimerRef.current !== null) {
      window.clearTimeout(bookySuccessTimerRef.current);
      bookySuccessTimerRef.current = null;
    }
    setBookyActionSuccess(false);
    setBookyQueryState("idle");
    setHelpOpen(true);
  }, []);

  const showBookySuccess = useCallback(() => {
    if (bookySuccessTimerRef.current !== null) {
      window.clearTimeout(bookySuccessTimerRef.current);
    }
    setBookyActionSuccess(true);
    bookySuccessTimerRef.current = window.setTimeout(() => {
      setBookyActionSuccess(false);
      bookySuccessTimerRef.current = null;
    }, 2600);
  }, []);

  const focusHelpTarget = useCallback((target: HTMLElement | null): EditorNavigationResult => {
    if (!target) return "not-found";
    if (target.matches(":disabled") || target.getAttribute("aria-disabled") === "true") return "unavailable";
    helpShouldReturnFocusRef.current = false;
    setHelpOpen(false);
    window.setTimeout(() => {
      if (helpHighlightTimerRef.current !== null) {
        window.clearTimeout(helpHighlightTimerRef.current);
      }
      target.scrollIntoView({ behavior: "smooth", block: "center" });
      target.focus({ preventScroll: true });
      target.classList.add("is-guidance-highlight", "editor-help-target");
      helpHighlightTimerRef.current = window.setTimeout(() => {
        target.classList.remove("is-guidance-highlight", "editor-help-target");
      }, 1800);
    }, 0);
    return "handled";
  }, []);

  const requestInlineHelpTarget = useCallback((request: Omit<InlineEditorHelpRequest, "nonce">): EditorNavigationResult => {
    helpShouldReturnFocusRef.current = false;
    setHelpOpen(false);
    miniJumpNonceRef.current += 1;
    setInlineHelpRequest({ ...request, nonce: miniJumpNonceRef.current });
    return "handled";
  }, []);

  const resolveHelpRoute = useCallback((entry: EditorHelpCatalogEntry): `/${string}` | undefined => {
    return resolveEditorHelpRoute(entry, bookId);
  }, [bookId]);

  const handleHelpAction = useCallback((entry: EditorHelpCatalogEntry): EditorNavigationResult => {
    const resolveAction = (): EditorNavigationResult => {
      const action = getEditorHelpActionDefinition(entry.actionId);
      if (!action) return "unavailable";
      if (action.target === "manuscript") return requestInlineHelpTarget({ kind: "focus-editor" });
      if (action.target === "insert-image") return requestInlineHelpTarget({ kind: "open-insert-menu", menuItem: "image" });
      if (action.target === "insert-youtube") return requestInlineHelpTarget({ kind: "open-youtube" });
      if (action.target === "insert-page-break") return requestInlineHelpTarget({ kind: "open-insert-menu", menuItem: "page-break" });
      if (action.target === "insert-columns") return requestInlineHelpTarget({ kind: "open-insert-menu", menuItem: "columns" });
      if (action.target === "insert-paywall") {
        if (contentBlocks.some((block) => block.type === "paywall")) return "unavailable";
        return requestInlineHelpTarget({ kind: "open-insert-menu", menuItem: "paywall" });
      }
      if (action.target === "manuscript-import") return focusHelpTarget(manuscriptImportTargetRef.current);
      if (action.target === "smart-format") return focusHelpTarget(smartFormatTargetRef.current);
      if (action.target === "smart-undo") return focusHelpTarget(smartUndoTargetRef.current);
      if (action.target === "cover") return focusHelpTarget(coverTargetRef.current);
      if (action.target === "slug") return focusHelpTarget(slugInputRef.current);
      if (action.target === "save") {
        return focusHelpTarget(headerActionsRef.current?.querySelector<HTMLElement>("[data-help-target='save']") || null);
      }
      if (action.target === "preview") return focusHelpTarget(previewTargetRef.current);
      if (action.target === "publish") return focusHelpTarget(publishTargetRef.current);
      if (action.target === "external-sales") return focusHelpTarget(externalSalesTargetRef.current);
      if (action.target === "pending-image" || action.target === "existing-paywall") {
        const resolution = resolveHelpBlockNavigationTarget(action.id, contentBlocks);
        if (resolution.status !== "handled") return resolution.status;
        helpShouldReturnFocusRef.current = false;
        setHelpOpen(false);
        miniJumpNonceRef.current += 1;
        guidanceRequestNonceRef.current = miniJumpNonceRef.current;
        setEditorScrollRequest({ blockId: resolution.blockId, nonce: miniJumpNonceRef.current, highlight: true });
        return "handled";
      }
      return "unavailable";
    };
    const result = resolveAction();
    if (result === "handled") showBookySuccess();
    return result;
  }, [contentBlocks, focusHelpTarget, requestInlineHelpTarget, showBookySuccess]);

  const handlePasteAutoFormat = useCallback((previousBlocks: BookContentBlock[]) => {
    setPasteUndoBlocks(previousBlocks);
  }, []);

  const handleInlineHelpRequestResult = useCallback((result: { nonce: number; status: "handled" | "not-found" }) => {
    if (inlineHelpRequest?.nonce !== result.nonce) return;
    setStatusMessage(result.status === "handled" ? "操作場所を開きました。" : "現在の状態では、この操作場所を開けません。");
  }, [inlineHelpRequest?.nonce]);

  if (isLoading) {
    return (
      <div className="reader-loading editor-loading" role="status" aria-live="polite">
        <span className="editor-loading-spinner" aria-hidden="true" />
        <strong>作品を読み込んでいます…</strong>
        <span>編集画面を準備しています。しばらくお待ちください。</span>
      </div>
    );
  }

  return (
    <main className="dashboard-page editor-page">
      <div className="dashboard-heading">
        <div>
          <p className="maker-kicker">Book editor</p>
          <HomeBackLink />
          <h1>{mode === "new" ? "新しい作品" : "作品を編集"}</h1>
          <p>ベータ制限：最大5作品、本文20万文字、画像30枚、画像10MBまで。</p>
        </div>
        <div ref={headerActionsRef} className="maker-actions">
          <BookyHelpTrigger
            buttonRef={helpTriggerRef}
            state={bookyState}
            expanded={helpOpen}
            onOpen={openHelp}
          />
          <Button data-help-target="save" variant="primary" type="button" disabled={isSaving} onClick={() => void handleCanonicalSave()}>
            {isSaving ? "保存中…" : "保存"}
          </Button>
          <button ref={publishTargetRef} className="maker-secondary-button" type="button" onClick={() => void handleCanonicalPublish()}>
            公開
          </button>
          {state.status === "published" && state.slug ? (
            <a
              className="maker-secondary-link"
              href={`/books/${encodeURIComponent(state.slug)}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              公開済み作品を見る
            </a>
          ) : null}
          <Link className="maker-secondary-link" href="/dashboard">
            作品一覧へ
          </Link>
        </div>
      </div>

      {helpOpen ? (
        <EditorHelpPanel
          onClose={closeHelp}
          onAction={handleHelpAction}
          resolveRoute={resolveHelpRoute}
          onBookyStateChange={setBookyQueryState}
        />
      ) : null}


      <section className="editor-workbench">
        <div className="editor-main-column">
        <div className="maker-card">
          <h2>基本情報</h2>
          <div className="maker-grid">
            <FormField id="book-title" label="タイトル" error={errors.title}>
              <input
                id="book-title"
                ref={titleInputRef}
                value={state.title}
                onChange={(event) => update("title", event.target.value)}
                aria-invalid={Boolean(errors.title)}
                aria-describedby={errors.title ? "book-title-error" : undefined}
              />
            </FormField>
            <FormField id="book-author-name" label="著者名" error={errors.author}>
              <input
                id="book-author-name"
                ref={authorInputRef}
                value={state.author}
                onChange={(event) => update("author", event.target.value)}
                aria-invalid={Boolean(errors.author)}
                aria-describedby={errors.author ? "book-author-name-error" : undefined}
              />
            </FormField>
            <label>
              <span>サブタイトル</span>
              <input value={state.subtitle} onChange={(event) => update("subtitle", event.target.value)} />
            </label>
            <FormField
              id="book-public-slug"
              label="公開URL"
              required
              helpText="半角英数字とハイフンで入力してください。公開後の作品URLに使用されます。"
              error={errors.slug || slugFormatError}
            >
              <div className="slug-input-wrap">
                <span className="slug-prefix">{publicBooksBaseUrl}</span>
                <input
                  id="book-public-slug"
                  ref={slugInputRef}
                  value={state.slug}
                  required
                  autoCapitalize="none"
                  autoCorrect="off"
                  autoComplete="off"
                  spellCheck={false}
                  aria-invalid={Boolean(errors.slug || slugFormatError)}
                  aria-describedby={`${errors.slug || slugFormatError ? "book-public-slug-error " : ""}book-public-slug-help`}
                  onChange={(event) => update("slug", event.target.value.normalize("NFKC").toLowerCase())}
                />
              </div>
              {!errors.slug && !slugFormatError && slugAvailabilityMessage ? <small className="maker-note">{slugAvailabilityMessage}</small> : null}
            </FormField>
          </div>
          <FormField
            id="book-description"
            label="説明文"
            helpText="作品の紹介やSNS共有、検索結果の説明に使用されます。"
            error={errors.description}
            className="maker-full"
          >
            <textarea
              id="book-description"
              ref={descriptionInputRef}
              rows={3}
              value={state.description}
              onChange={(event) => update("description", event.target.value)}
              aria-invalid={Boolean(errors.description)}
              aria-describedby={errors.description ? "book-description-error book-description-help" : "book-description-help"}
            />
          </FormField>
        </div>

        <div className="maker-card">
          <h2>作者ページ</h2>
          <p className="maker-note">公開作品は作者ページから一覧表示できます。</p>
          <div className="maker-grid">
            <FormField
              id="book-author-handle"
              label="作者ハンドル"
              helpText="作者ページのURLに使用します。半角英数字とハイフンで入力してください。"
              error={errors.authorHandle}
            >
              <input
                id="book-author-handle"
                ref={authorHandleInputRef}
                value={state.authorHandle}
                aria-invalid={Boolean(errors.authorHandle)}
                aria-describedby={errors.authorHandle ? "book-author-handle-error book-author-handle-help" : "book-author-handle-help"}
                onChange={(event) => update("authorHandle", event.target.value.normalize("NFKC").replace(/^@+/, "").toLowerCase())}
              />
            </FormField>
            <label>
              <span>ホームページ</span>
              <input value={state.authorWebsiteUrl} onChange={(event) => update("authorWebsiteUrl", event.target.value)} placeholder="https://example.com" />
            </label>
            <label>
              <span>X</span>
              <input value={state.authorXUrl} onChange={(event) => update("authorXUrl", event.target.value)} placeholder="https://x.com/..." />
            </label>
            <label>
              <span>note</span>
              <input value={state.authorNoteUrl} onChange={(event) => update("authorNoteUrl", event.target.value)} placeholder="https://note.com/..." />
            </label>
          </div>
          <label className="maker-full">
            <span>自己紹介</span>
            <textarea rows={3} value={state.authorBio} onChange={(event) => update("authorBio", event.target.value)} />
          </label>
        </div>

        <div className="maker-card">
          <h2>原稿</h2>
          <label ref={manuscriptImportTargetRef} className="manuscript-file-picker" aria-label="原稿ファイルを選択" tabIndex={-1}>
            <span>TXT / Markdown / Word / PDF / ZIPを読み込む</span>
            <span className="manuscript-file-button">ファイルを選択</span>
            <input
              className="manuscript-file-input"
              ref={manuscriptInputRef}
              type="file"
              accept=".txt,.md,.markdown,.docx,.pdf,.zip"
              onChange={(event) => void handleImport(event.target.files?.[0])}
            />
          </label>
          <p className="maker-note">文章の途中にカーソルを置いて、画像を貼り付け・ドラッグ&ドロップ・選択挿入できます。</p>
          <div className="smart-format-action" aria-label="自動整形">
            <button ref={smartFormatTargetRef} className="maker-secondary-button" type="button" onClick={handleSmartFormat} disabled={isSaving || !contentBlocks.length}>
              自動で整える
            </button>
            <span className="maker-note">文章は変更せず、見出し・段落・ページ構成を整えます。</span>
          </div>
          {smartFormatSummary ? (
            <div className="maker-note inline-paste-undo" role="status">
              {smartFormatSummary}
              <button ref={smartUndoTargetRef} className="maker-secondary-button" type="button" onClick={handleSmartFormatUndo}>整形前に戻す</button>
            </div>
          ) : null}
          <EditorGuidanceCard
            id="editor-guidance-mobile"
            summary={editorGuidanceSnapshot.summary}
            issues={visibleEditorGuidance}
            className="editor-guidance-mobile"
            embedded
            onIssueAction={handleGuidanceAction}
          >
            <p className="maker-note">
              推定ページ数: {estimatedPages} / 20ページ
              <br />
              文章: {textPages}ページ / 挿絵: {imagePages}ページ / 自動保存: {autosaveLabel}
            </p>
          </EditorGuidanceCard>
          {pendingImageCount > 0 ? (
            <div className="editor-pending-warning" role="alert">
              <strong>画像のアップロードが完了していません。</strong>
              <span>
                {stalePendingImageIds.length ? "前回の編集内容から未完了の画像が復元されています。" : ""}
                {flattenContentBlocks(contentBlocks)
                  .filter((block): block is Extract<BookContentBlock, { type: "image" }> => block.type === "image" && block.uploadState === "pending")
                  .map((block) => block.fileName)
                  .join("、") || "未完了の画像"}
                。画像をクリックして再アップロードするか、削除してください。
              </span>
            </div>
          ) : null}
          {pasteUndoBlocks ? (
            <div className="maker-note inline-paste-undo" role="status">
              貼り付けた原稿を自動整形しました。
              <button className="maker-secondary-button" type="button" onClick={handlePasteUndo}>貼り付け前に戻す</button>
            </div>
          ) : null}
          <InlineManuscriptEditor
            value={contentBlocks}
            revision={String(editorRevision)}
            onChange={syncContentBlocks}
            onStatus={setStatusMessage}
            onPendingChange={setPendingImageCount}
            onCursorChange={handleCursorChange}
            scrollRequest={editorScrollRequest}
            onScrollRequestResult={handleEditorScrollRequestResult}
            pageBreakAfterBlockIds={pageBreakAfterBlockIds}
            onInsertPageBreak={handleEditorInsertPageBreak}
            onRemovePageBreak={handleEditorRemovePageBreak}
            onInsertPaywall={handleEditorInsertPaywall}
            onRemovePaywall={handleEditorRemovePaywall}
            onInsertColumns={handleEditorInsertColumns}
            onPasteAutoFormat={handlePasteAutoFormat}
            helpRequest={inlineHelpRequest}
            onHelpRequestResult={handleInlineHelpRequestResult}
          />
          <p className="inline-manuscript-character-count" aria-live="polite">
            <strong>{Math.min(cursorPosition, bodyCharacterCount).toLocaleString("ja-JP")}</strong>
            {" / "}
            {bodyCharacterCount.toLocaleString("ja-JP")}文字
            {bodyCharacterCount ? ` ${bodyCharacterPercentage}%` : ""}
          </p>
          {errors.rawText ? <small className="form-error">{errors.rawText}</small> : null}
        </div>
        </div>

        <aside className="editor-side-column" aria-label="設定とMini Preview">
          <EditorGuidanceCard
            id="editor-guidance-desktop"
            summary={editorGuidanceSnapshot.summary}
            issues={visibleEditorGuidance}
            className="editor-status-card editor-guidance-desktop"
            onIssueAction={handleGuidanceAction}
          >
            <p className="maker-note">
              推定ページ数: {estimatedPages} / 20ページ
              <br />
              文章: {textPages}ページ / 挿絵: {imagePages}ページ / 自動保存: {autosaveLabel}
            </p>
          </EditorGuidanceCard>

          <EditorMiniPreview
            pages={miniPreviewPages}
            logicalPages={miniPreviewLogicalPages}
            activePageId={activeMiniPageId}
            onPageClick={handleMiniPageClick}
          />

          <ConnectSalesPanel
            bookId={bookId}
            hasPaywall={contentBlocks.some((block) => block.type === "paywall")}
          />

        <div ref={coverTargetRef} className="maker-card editor-cover-settings" tabIndex={-1}>
          <h2>表紙画像</h2>
          <div className="cover-picker">
            <div className="cover-preview">
              {state.coverImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={state.coverImage} alt="表紙プレビュー" />
              ) : (
                <span>Default Cover</span>
              )}
            </div>
            <div>
              <label className="cover-file-picker" aria-label="表紙画像を選択">
                <span>ファイルを選択</span>
                <input className="cover-file-input" ref={coverInputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => void handleCover(event.target.files?.[0])} />
              </label>
              <button className="maker-small-button" type="button" onClick={() => {
                update("coverImage", undefined);
                update("coverImageStoragePath", undefined);
                update("coverFileName", undefined);
              }}>
                表紙を解除
              </button>
            </div>
          </div>
        </div>

        <div className="maker-card editor-design-settings">
          <h2>デザイン・公開設定</h2>
          <div className="maker-grid">
            <label>
              <span>UI言語</span>
              <select value={state.language} onChange={(event) => update("language", event.target.value as SupportedLocale)}>
                {SUPPORTED_LOCALES.map((locale) => (
                  <option key={locale} value={locale}>{localeLabels[locale]}</option>
                ))}
              </select>
            </label>
            <label>
              <span>綴じ方向</span>
              <select value={state.bindingDirection} onChange={(event) => update("bindingDirection", event.target.value as "rtl" | "ltr")}>
                <option value="rtl">右綴じ</option>
                <option value="ltr">左綴じ</option>
              </select>
            </label>
            <label>
              <span>フォント</span>
              <select value={state.fontFamily} onChange={(event) => update("fontFamily", event.target.value as BookThemeSettings["fontFamily"])}>
                <option value="mincho">明朝</option>
                <option value="gothic">ゴシック</option>
                <option value="serif">Serif</option>
                <option value="sans">Sans</option>
              </select>
            </label>
            <label>
              <span>文字サイズ</span>
              <select value={state.fontScale} onChange={(event) => update("fontScale", event.target.value as BookThemeSettings["fontScale"])}>
                <option value="small">小</option>
                <option value="medium">中</option>
                <option value="large">大</option>
              </select>
            </label>
            <label>
              <span>行間</span>
              <select value={state.lineHeight} onChange={(event) => update("lineHeight", event.target.value as BookThemeSettings["lineHeight"])}>
                <option value="tight">詰める</option>
                <option value="normal">標準</option>
                <option value="relaxed">広め</option>
              </select>
            </label>
            <label>
              <span>余白</span>
              <select value={state.marginScale} onChange={(event) => update("marginScale", event.target.value as BookThemeSettings["marginScale"])}>
                <option value="compact">狭め</option>
                <option value="standard">標準</option>
                <option value="wide">広め</option>
              </select>
            </label>
            <label>
              <span>ページ幅</span>
              <select value={state.pageWidth} onChange={(event) => update("pageWidth", event.target.value as BookThemeSettings["pageWidth"])}>
                <option value="narrow">狭め</option>
                <option value="standard">標準</option>
                <option value="wide">広め</option>
              </select>
            </label>
            <label>
              <span>背景</span>
              <select value={state.background} onChange={(event) => update("background", event.target.value as BookThemeSettings["background"])}>
                <option value="paper">紙</option>
                <option value="ivory">アイボリー</option>
                <option value="cafe">カフェ</option>
                <option value="green">グリーン</option>
                <option value="night">ナイト</option>
                <option value="white">ホワイト</option>
              </select>
            </label>
            <label>
              <span>本文テキスト色</span>
              <input value={state.textColor} onChange={(event) => updateColor("textColor", event.target.value)} placeholder="#2f251d" />
            </label>
            <label>
              <span>表紙スタイル</span>
              <select value={state.coverStyle} onChange={(event) => update("coverStyle", event.target.value as BookThemeSettings["coverStyle"])}>
                <option value="overlay">オーバーレイ</option>
                <option value="solid">ソリッド</option>
                <option value="band">バンド</option>
              </select>
            </label>
            <label>
              <span>画像レイアウト</span>
              <select value={state.imageLayout} onChange={(event) => update("imageLayout", event.target.value as BookThemeSettings["imageLayout"])}>
                <option value="framed">余白フレーム</option>
                <option value="full">全面表示</option>
                <option value="contained">収まり優先</option>
              </select>
            </label>
            <label>
              <span>ページ文字量</span>
              <input type="number" min={180} max={1200} value={state.charactersPerPage} onChange={(event) => update("charactersPerPage", Number(event.target.value) || 380)} />
            </label>
            <label>
              <span>目次項目数</span>
              <input type="number" min={1} max={20} value={state.tableOfContentsItemsPerPage} onChange={(event) => update("tableOfContentsItemsPerPage", Number(event.target.value) || 6)} />
            </label>
            <label>
              <span>公開範囲</span>
              <select value={state.visibility} onChange={(event) => update("visibility", event.target.value as "private" | "unlisted" | "public")}>
                <option value="private">非公開</option>
                <option value="unlisted">限定公開</option>
                <option value="public">公開</option>
              </select>
            </label>
          </div>
          {colorContrast < 4.5 ? (
            <p className="maker-note form-error">配色コントラストが低めです（{colorContrast.toFixed(2)}）。本文可読性のため 4.5 以上を推奨します。</p>
          ) : null}
          <div className="maker-grid external-link-grid">
            <label>
              <span>作品末尾に表示する外部リンク名</span>
              <input value={state.externalLinkLabel} onChange={(event) => update("externalLinkLabel", event.target.value)} placeholder="Kindle / note / 講座 / お問い合わせ など" />
            </label>
            <label>
              <span>作品末尾に表示する外部リンクURL</span>
              <input value={state.externalLinkUrl} onChange={(event) => update("externalLinkUrl", event.target.value)} placeholder="https://..." />
            </label>
            <label>
              <span>外部販売ページ名</span>
              <input value={state.externalSalesLabel} onChange={(event) => update("externalSalesLabel", event.target.value)} placeholder="購入ページ / 応援ページ など" />
            </label>
            <label>
              <span>外部販売ページURL</span>
              <input ref={externalSalesTargetRef} value={state.externalSalesUrl} onChange={(event) => update("externalSalesUrl", event.target.value)} placeholder="https://..." />
            </label>
          </div>
          <p className="maker-note">WebBookMakerは決済に関与しません。販売や応援は外部URLへの導線として扱います。</p>
        </div>
        </aside>
      </section>

      {warnings.length ? <div className="maker-warning">{warnings.map((warning) => <p key={warning}>{warning}</p>)}</div> : null}
      {requiredErrorMessage ? (
        <p className="maker-status maker-status-error" role="alert" aria-live="assertive">
          {requiredErrorMessage}
        </p>
      ) : null}
      {statusMessage ? <p className="maker-status" aria-live="polite">{statusMessage}</p> : null}

      <div className="maker-actions sticky-actions">
        <Button variant="primary" type="button" disabled={isSaving} onClick={() => void handleCanonicalSave()}>
          {isSaving ? "保存中…" : "保存"}
        </Button>
        <button ref={previewTargetRef} className="maker-secondary-button" type="button" onClick={() => void handleCanonicalPreview()}>
          プレビュー
        </button>
        <button className="maker-secondary-button" type="button" onClick={() => void handleCanonicalPublish()}>
          公開する
        </button>
        {state.status === "published" ? (
          <button className="maker-secondary-button danger" type="button" onClick={() => void unpublish()}>
            公開停止
          </button>
        ) : null}
      </div>
    </main>
  );
}
