"use client";

import Link from "next/link";
import { useParams, usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import { BETA_LIMITS } from "@/lib/limits";
import { publicBookBaseUrl } from "@/lib/promotion";
import {
  contentBlocksFromLegacy,
  contentBlocksToRawText,
  type BookContentBlock,
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
  deleteDraft,
  deletePreviewReturnState,
  loadDraft,
  loadPreviewReturnState,
  saveDraft,
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
import { createSlugCandidate, normalizeSlugInput, validateSlug } from "@/lib/slug";
import { trackEvent } from "@/lib/analytics";
import { normalizeHandle, safeExternalUrl, type ExternalLink, type ThemeId } from "@/lib/productTypes";
import { localeLabels, SUPPORTED_LOCALES, type SupportedLocale } from "@/lib/localization";
import { colorPresets, contrastRatio, getThemePreset, themePresets, type BookThemeSettings } from "@/lib/themeSystem";
import { buildEditorDraftFields, seedFromDraftFields } from "@/lib/editorDraftState";
import { validateRequiredBookFields } from "@/lib/editorValidation";
import { logSupabaseIssue } from "@/lib/supabaseDebug";
import CharacterAssistant from "@/components/CharacterAssistant";
import InlineManuscriptEditor from "@/components/InlineManuscriptEditor";
import HomeBackLink from "@/components/HomeBackLink";
import Button from "@/components/ui/Button";
import FormField from "@/components/ui/FormField";

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
};

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
  return seedFromDraftFields({
    mode,
    initialState: INITIAL_EDITOR,
    fields: draft?.fields,
  });
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
  for (const [index, block] of blocks.entries()) {
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
      orderInChapter: index + 1,
    });
  }
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
    return storedBlocks;
  }
  return contentBlocksFromLegacy(record.rawText, imagesFromRecord(record));
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
    charactersPerPage: project.config.charactersPerPage,
    tableOfContentsItemsPerPage: project.config.tableOfContentsItemsPerPage,
    slug: createSlugCandidate(project.config.title),
    authorHandle: project.config.authorProfile?.handle || "",
    authorBio: project.config.authorProfile?.bio || "",
    authorWebsiteUrl: project.config.authorProfile?.websiteUrl || "",
    authorXUrl: project.config.authorProfile?.snsLinks.find((link) => link.label === "X")?.url || "",
    authorNoteUrl: project.config.authorProfile?.snsLinks.find((link) => link.type === "note")?.url || "",
    externalLinkLabel: project.config.externalLinks?.[0]?.label || "",
    externalLinkUrl: project.config.externalLinks?.[0]?.url || "",
    externalSalesUrl: project.config.monetization?.externalSalesUrl || "",
    externalSalesLabel: project.config.monetization?.externalSalesLabel || "",
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
  const params = useParams<{ id?: string }>();
  const { user } = useAuth();
  const titleInputRef = useRef<HTMLInputElement | null>(null);
  const authorInputRef = useRef<HTMLInputElement | null>(null);
  const manuscriptInputRef = useRef<HTMLInputElement | null>(null);
  const coverInputRef = useRef<HTMLInputElement | null>(null);
  const [bookId, setBookId] = useState<string | undefined>(params.id);
  const [state, setState] = useState<EditorState>(draftSeed.state);
  const [images, setImages] = useState<UploadedBookImage[]>(draftSeed.images);
  const [contentBlocks, setContentBlocks] = useState<BookContentBlock[]>(
    draftSeed.contentBlocks.length ? draftSeed.contentBlocks : [{ id: "text-001", type: "text", content: "" }],
  );
  const [editorRevision, setEditorRevision] = useState(0);
  const [pendingImageCount, setPendingImageCount] = useState(0);
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
  const statusMessageTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (statusMessageTimeoutRef.current !== null) {
        window.clearTimeout(statusMessageTimeoutRef.current);
      }
    };
  }, []);

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
      setState(stateFromPreviewProject(materializedProject));
      setBookId(materializedProject.config.bookId);
      setImages(imagesFromPreviewProject(materializedProject));
      setContentBlocks(contentBlocksFromPreviewProject(materializedProject));
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
        setState(fromRecord(materializedBook));
        setBookId(materializedBook.id);
        setImages(imagesFromRecord(materializedBook));
        setContentBlocks(contentBlocksFromRecord(materializedBook));
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

  const estimatedPages = useMemo(() => {
    const charsPerPage = Math.max(180, Number(state.charactersPerPage) || 380);
    const characterCount = contentBlocks
      .filter((block): block is Extract<BookContentBlock, { type: "text" }> => block.type === "text")
      .reduce((sum, block) => sum + block.content.trim().length, 0);
    const imagePages = contentBlocks.filter((block) => block.type === "image").length;
    const textPages = characterCount ? Math.max(1, Math.ceil(characterCount / charsPerPage)) : 0;
    return textPages + imagePages;
  }, [contentBlocks, state.charactersPerPage]);

  const textPages = useMemo(() => {
    const charsPerPage = Math.max(180, Number(state.charactersPerPage) || 380);
    const characterCount = contentBlocks
      .filter((block): block is Extract<BookContentBlock, { type: "text" }> => block.type === "text")
      .reduce((sum, block) => sum + block.content.trim().length, 0);
    return characterCount ? Math.max(1, Math.ceil(characterCount / charsPerPage)) : 0;
  }, [contentBlocks, state.charactersPerPage]);

  const imagePages = useMemo(() => contentBlocks.filter((block) => block.type === "image").length, [contentBlocks]);

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
    if (mode !== "new") return;
    if (!dirty) return;
    if (!isHydrated || !hasRestoredDraft) return;
    const timeoutId = window.setTimeout(() => {
      const saved = saveDraft(autosaveDraftFields);
      if (!saved) return;
      setAutosaveAt(saved.savedAt);
    }, 700);
    return () => window.clearTimeout(timeoutId);
  }, [autosaveDraftFields, dirty, hasRestoredDraft, isHydrated, mode]);

  const validateRequiredBeforeAction = () => {
    const validation = validateRequiredBookFields({
      title: state.title,
      authorName: state.author,
    });

    setErrors((current) => {
      const next = { ...current };
      if (validation.fieldErrors.title) {
        next.title = validation.fieldErrors.title;
      } else {
        delete next.title;
      }
      if (validation.fieldErrors.author) {
        next.author = validation.fieldErrors.author;
      } else {
        delete next.author;
      }
      return next;
    });

    setRequiredErrorMessage(validation.globalError);
    if (validation.isValid) return true;

    const firstMissing = !validation.hasTitle ? titleInputRef.current : authorInputRef.current;
    firstMissing?.scrollIntoView({ behavior: "smooth", block: "center" });
    firstMissing?.focus();
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
    if (key === "title" || key === "author") {
      setErrors((current) => {
        const next = { ...current };
        if (key === "title" && String(value).trim().length > 0) {
          delete next.title;
        }
        if (key === "author" && String(value).trim().length > 0) {
          delete next.author;
        }
        return next;
      });
      const nextTitle = key === "title" ? String(value) : state.title;
      const nextAuthor = key === "author" ? String(value) : state.author;
      if (nextTitle.trim().length > 0 && nextAuthor.trim().length > 0) {
        setRequiredErrorMessage("");
      }
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

  const applyThemePreset = (themeId: ThemeId) => {
    const preset = getThemePreset(themeId);
    setState((current) => {
      const nextTextColor = ensureAaTextColor(preset.settings.textColor, preset.settings.background);
      return {
        ...current,
        theme: themeId,
        fontFamily: preset.settings.fontFamily,
        fontScale: preset.settings.fontScale,
        lineHeight: preset.settings.lineHeight,
        marginScale: preset.settings.marginScale,
        pageWidth: preset.settings.pageWidth,
        background: preset.settings.background,
        textColor: nextTextColor,
        accentColor: preset.settings.accentColor,
        coverStyle: preset.settings.coverStyle,
        imageLayout: preset.settings.imageLayout,
      };
    });
    setDirty(true);
  };

  useEffect(() => {
    if (!user) return;
    if (!state.slug.trim()) return;

    const normalizedSlug = normalizeSlugInput(state.slug || "");
    const formatError = validateSlug(normalizedSlug);
    if (formatError) return;

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
    setContentBlocks(nextBlocks);
    setImages(uploadedImagesFromBlocks(nextBlocks));
    setState((current) => ({ ...current, rawText: contentBlocksToRawText(nextBlocks) }));
    setDirty(true);
  };

  const applyImportedContent = (nextBlocks: BookContentBlock[]) => {
    syncContentBlocks(nextBlocks);
    setEditorRevision((current) => current + 1);
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
    }));
    setImages(nextImages);
    setContentBlocks(nextBlocks);
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

  const handleCanonicalSave = async () => {
    if (!user || isSaving) return null;
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
      if (mode === "new" || didRestorePreviewDraft) deleteDraft();
      if (didRestorePreviewDraft || previewDraftId) {
        deletePreviewReturnState(previewDraftId || undefined);
        await deleteCanonicalPreview();
      }
      setStatusMessage(`公開しました: ${published.publicUrl}`);
      trackEvent("book_published", { bookId: published.bookId });
      router.push(published.publicUrl);
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

  if (isLoading) return <div className="reader-loading">作品を読み込んでいます…</div>;

  return (
    <main className="dashboard-page editor-page">
      <div className="dashboard-heading">
        <div>
          <p className="maker-kicker">Book editor</p>
          <HomeBackLink />
          <h1>{mode === "new" ? "新しい作品" : "作品を編集"}</h1>
          <p>ベータ制限：最大5作品、本文20万文字、画像30枚、画像10MBまで。</p>
        </div>
        <div className="maker-actions">
          <Button variant="primary" type="button" disabled={isSaving} onClick={() => void handleCanonicalSave()}>
            {isSaving ? "保存中…" : "保存"}
          </Button>
          <button className="maker-secondary-button" type="button" onClick={() => void handleCanonicalPublish()}>
            公開
          </button>
          <Link className="maker-secondary-link" href="/dashboard">
            作品一覧へ
          </Link>
        </div>
      </div>

      <CharacterAssistant event={statusMessage.includes("失敗") ? "error" : dirty ? "welcome" : "save"} compact />

      <section className="editor-workbench">
        <div className="editor-main-column">
        <div className="maker-card">
          <h2>基本情報</h2>
          <div className="maker-grid">
            <label>
              <span>タイトル 必須</span>
              <input
                ref={titleInputRef}
                value={state.title}
                onChange={(event) => update("title", event.target.value)}
                aria-invalid={Boolean(errors.title)}
                aria-describedby={errors.title ? "editor-title-error" : undefined}
              />
              {errors.title ? <small id="editor-title-error" className="form-error">{errors.title}</small> : null}
            </label>
            <label>
              <span>著者名 必須</span>
              <input
                ref={authorInputRef}
                value={state.author}
                onChange={(event) => update("author", event.target.value)}
                aria-invalid={Boolean(errors.author)}
                aria-describedby={errors.author ? "editor-author-error" : undefined}
              />
              {errors.author ? <small id="editor-author-error" className="form-error">{errors.author}</small> : null}
            </label>
            <label>
              <span>サブタイトル</span>
              <input value={state.subtitle} onChange={(event) => update("subtitle", event.target.value)} />
            </label>
            <FormField id="editor-slug" label="公開URL" error={errors.slug || slugFormatError}>
              <div className="slug-input-wrap">
                <span className="slug-prefix">{publicBooksBaseUrl}</span>
                <input
                  id="editor-slug"
                  value={state.slug}
                  autoCapitalize="none"
                  autoCorrect="off"
                  autoComplete="off"
                  spellCheck={false}
                  onChange={(event) => update("slug", normalizeSlugInput(event.target.value))}
                />
              </div>
              {!errors.slug && !slugFormatError && slugAvailabilityMessage ? <small className="maker-note">{slugAvailabilityMessage}</small> : null}
            </FormField>
          </div>
          <label className="maker-full">
            <span>説明文</span>
            <textarea rows={3} value={state.description} onChange={(event) => update("description", event.target.value)} />
          </label>
        </div>

        <div className="maker-card">
          <h2>作者ページ</h2>
          <p className="maker-note">公開作品は作者ページから一覧表示できます。例：/authors/mako</p>
          <div className="maker-grid">
            <label>
              <span>作者ハンドル</span>
              <input
                value={state.authorHandle}
                placeholder="@mako"
                onChange={(event) => update("authorHandle", normalizeHandle(event.target.value, ""))}
              />
            </label>
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
          <label>
            <span>TXT / Markdown / Word / PDF / ZIPを読み込む</span>
            <input
              ref={manuscriptInputRef}
              type="file"
              accept=".txt,.md,.markdown,.docx,.pdf,.zip"
              onChange={(event) => void handleImport(event.target.files?.[0])}
            />
          </label>
          <p className="maker-note">文章の途中にカーソルを置いて、画像を貼り付け・ドラッグ&ドロップ・選択挿入できます。</p>
          <InlineManuscriptEditor
            value={contentBlocks}
            revision={String(editorRevision)}
            onChange={syncContentBlocks}
            onStatus={setStatusMessage}
            onPendingChange={setPendingImageCount}
          />
          {errors.rawText ? <small className="form-error">{errors.rawText}</small> : null}
        </div>
        </div>

        <aside className="editor-side-column" aria-label="リアルタイムプレビューと設定">
          <section className="maker-card live-preview-card">
            <p className="maker-kicker">Realtime preview</p>
            <h2>{state.title || "無題のWebブック"}</h2>
            <p>{state.description || "説明文を入力すると、公開時の紹介文として使われます。"}</p>
            <p className="maker-note">
              推定ページ数: {estimatedPages} / 20ページ
              <br />
              文章: {textPages}ページ / 挿絵: {imagePages}ページ / 自動保存: {autosaveLabel}
            </p>
            <div
              className={`mini-book-preview theme-${state.theme} book-bg-${state.background} book-font-${state.fontFamily} book-size-${state.fontScale} book-leading-${state.lineHeight} book-cover-style-${state.coverStyle} book-image-layout-${state.imageLayout}`}
              style={{
                color: state.textColor,
                borderColor: state.accentColor,
              }}
            >
              <strong>{state.title || "TITLE"}</strong>
              <span>{state.author || "Author"}</span>
              <p>{state.rawText.replace(/^# .+$/gm, "").trim().slice(0, 110) || "本文のプレビューがここに表示されます。"}</p>
            </div>
          </section>

        <div className="maker-card">
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
              <label>
                <span>表紙画像</span>
                <input ref={coverInputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => void handleCover(event.target.files?.[0])} />
              </label>
              {state.coverFileName ? <p className="maker-note">選択中：{state.coverFileName}</p> : null}
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

        <div className="maker-card">
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
              <span>テーマ</span>
              <select value={state.theme} onChange={(event) => applyThemePreset(event.target.value as ThemeId)}>
                {themePresets.map((preset) => (
                  <option key={preset.id} value={preset.id}>
                    {preset.name}{preset.plan === "plus" ? "（Plus）" : ""}
                  </option>
                ))}
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
              </select>
            </label>
            <label>
              <span>本文テキスト色</span>
              <input value={state.textColor} onChange={(event) => updateColor("textColor", event.target.value)} placeholder="#2f251d" />
            </label>
            <label>
              <span>アクセント色</span>
              <input value={state.accentColor} onChange={(event) => updateColor("accentColor", event.target.value)} placeholder="#6bb9ad" />
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
          <div className="theme-color-presets">
            {colorPresets.map((preset) => (
              <button
                key={preset.name}
                className="maker-small-button"
                type="button"
                onClick={() => {
                  setState((current) => ({
                    ...current,
                    textColor: ensureAaTextColor(preset.text, current.background),
                    accentColor: preset.accent,
                  }));
                  setDirty(true);
                }}
              >
                {preset.name}
              </button>
            ))}
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
              <input value={state.externalSalesUrl} onChange={(event) => update("externalSalesUrl", event.target.value)} placeholder="https://..." />
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
        <button className="maker-secondary-button" type="button" onClick={() => void handleCanonicalPreview()}>
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
