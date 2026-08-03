import { contentBlocksFromLegacy, type BookContentBlock, type UploadedBookImage } from "@/lib/bookProject";
import type { SupportedLocale } from "@/lib/localization";
import type { ThemeId } from "@/lib/productTypes";
import type { BookThemeSettings } from "@/lib/themeSystem";

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

export function buildEditorDraftFields(input: {
  mode: "new" | "edit";
  state: EditorDraftState;
  images: UploadedBookImage[];
  contentBlocks: BookContentBlock[];
  draftId: string;
}) {
  return {
    mode: input.mode,
    draftId: input.draftId,
    ...input.state,
    images: input.images,
    contentBlocks: input.contentBlocks,
  };
}

export function seedFromDraftFields(input: {
  mode: "new" | "edit";
  initialState: EditorDraftState;
  fields?: Record<string, unknown>;
}): DraftSeed {
  if (input.mode !== "new" || !input.fields) {
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
          typeof (image as UploadedBookImage).dataUrl === "string"
        );
      })
    : [];
  const draftBlocks = Array.isArray(fields.contentBlocks)
    ? (fields.contentBlocks as BookContentBlock[])
    : contentBlocksFromLegacy(rawText, draftImages);

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
    coverImage: asString(fields.coverImage) || undefined,
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
    charactersPerPage: asNumber(fields.charactersPerPage, input.initialState.charactersPerPage),
    tableOfContentsItemsPerPage: asNumber(fields.tableOfContentsItemsPerPage, input.initialState.tableOfContentsItemsPerPage),
    visibility: asString(fields.visibility, input.initialState.visibility) as EditorDraftState["visibility"],
    status: asString(fields.status, input.initialState.status) as EditorDraftState["status"],
    slug: asString(fields.slug, input.initialState.slug),
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

  const hasAnyDraftContent = Boolean(
    restoredState.title.trim() ||
      restoredState.author.trim() ||
      restoredState.rawText.trim() ||
      draftImages.length ||
      draftBlocks.length > 1 ||
      restoredState.coverImage,
  );

  return {
    state: restoredState,
    images: draftImages,
    contentBlocks: draftBlocks.length ? draftBlocks : [{ id: "text-001", type: "text", content: rawText }],
    restored: hasAnyDraftContent,
  };
}
