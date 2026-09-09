import type { BookConfig } from "@/config/bookConfig";
import { DEFAULT_BOOK_DESIGN_SPEC, designSpecFromBookConfig, parseBookDesignSpec, type BookDesignHistoryEntry, type BookDesignSpec } from "@/lib/designSpec";
import type { BookContentBlock } from "@/lib/bookProject";

export const AI_BOOK_DESIGNER_MAX_PROMPT_LENGTH = 800;
export const AI_BOOK_DESIGNER_MAX_CONTEXT_SAMPLE = 1800;
export const AI_BOOK_DESIGNER_MAX_HISTORY = 30;

export type DesignEditableState = {
  theme: BookConfig["theme"];
  bindingDirection: BookConfig["bindingDirection"];
  fontFamily: NonNullable<BookConfig["themeSettings"]>["fontFamily"];
  fontScale: NonNullable<BookConfig["themeSettings"]>["fontScale"];
  lineHeight: NonNullable<BookConfig["themeSettings"]>["lineHeight"];
  marginScale: NonNullable<BookConfig["themeSettings"]>["marginScale"];
  pageWidth: NonNullable<BookConfig["themeSettings"]>["pageWidth"];
  background: NonNullable<BookConfig["themeSettings"]>["background"];
  textColor: string;
  accentColor: string;
  coverStyle: NonNullable<BookConfig["themeSettings"]>["coverStyle"];
  imageLayout: NonNullable<BookConfig["themeSettings"]>["imageLayout"];
  coverDesign: NonNullable<BookConfig["coverDesign"]>;
};

export function sanitizeDesignPrompt(value: unknown) {
  return typeof value === "string" ? value.trim().slice(0, AI_BOOK_DESIGNER_MAX_PROMPT_LENGTH) : "";
}

/** Apply only the allow-listed presentation fields. Content/identity fields are never touched. */
export function applyDesignSpecToState<T extends DesignEditableState>(state: T, spec: BookDesignSpec): T {
  return {
    ...state,
    theme: spec.theme,
    bindingDirection: spec.page.bindingDirection,
    fontFamily: spec.typography.fontFamily,
    fontScale: spec.typography.fontScale,
    lineHeight: spec.typography.lineHeight,
    marginScale: spec.page.marginScale,
    pageWidth: spec.page.pageWidth,
    background: spec.page.background,
    textColor: spec.palette.textColor,
    accentColor: spec.palette.accentColor,
    coverStyle: spec.cover.coverStyle,
    imageLayout: spec.image.layout,
    coverDesign: {
      ...state.coverDesign,
      layout: spec.cover.layout,
      titlePosition: spec.cover.titlePosition,
      authorPosition: spec.cover.authorPosition,
      imagePosition: spec.cover.imagePosition,
      imageFit: spec.cover.imageFit,
      titleVisible: spec.cover.titleVisible,
      authorVisible: spec.cover.authorVisible,
      titleScale: spec.cover.titleScale,
      authorScale: spec.cover.authorScale,
      imageScale: spec.cover.imageScale,
      overlayOpacity: spec.cover.overlayOpacity,
      titleTextOverride: spec.cover.titleTextOverride,
    },
  };
}

export function designSpecForState(state: DesignEditableState): BookDesignSpec {
  return designSpecFromBookConfig({
    theme: state.theme,
    bindingDirection: state.bindingDirection,
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
    coverDesign: state.coverDesign,
  });
}

export function emptyDesignSpec() {
  return DEFAULT_BOOK_DESIGN_SPEC;
}

export function appendDesignHistory(
  entries: BookDesignHistoryEntry[] | undefined,
  entry: BookDesignHistoryEntry,
) {
  return [...(entries || []).map((item) => ({ ...item, active: false })), { ...entry, active: true }].slice(-AI_BOOK_DESIGNER_MAX_HISTORY);
}

/** Validate persisted history before exposing it to the editor. */
export function normalizeDesignHistory(value: unknown, fallbackBookId = "draft") {
  if (!Array.isArray(value)) return [] as BookDesignHistoryEntry[];
  return value.map((candidate): BookDesignHistoryEntry | null => {
    if (!candidate || typeof candidate !== "object") return null;
    const item = candidate as Partial<BookDesignHistoryEntry>;
    const parsed = parseBookDesignSpec(item.spec);
    if (!parsed.success || typeof item.id !== "string" || typeof item.prompt !== "string" || typeof item.createdAt !== "string") return null;
    return {
      id: item.id.slice(0, 80),
      bookId: typeof item.bookId === "string" && item.bookId ? item.bookId : fallbackBookId,
      ownerId: typeof item.ownerId === "string" ? item.ownerId : undefined,
      spec: parsed.data,
      prompt: sanitizeDesignPrompt(item.prompt),
      createdAt: item.createdAt,
      name: typeof item.name === "string" ? item.name.slice(0, 80) : undefined,
      active: item.active === true,
    };
  }).filter((entry): entry is BookDesignHistoryEntry => Boolean(entry)).slice(-AI_BOOK_DESIGNER_MAX_HISTORY);
}

export function buildDesignContext(input: {
  title: string;
  description: string;
  rawText: string;
  contentBlocks: BookContentBlock[];
  current: DesignEditableState;
}) {
  const flat = input.contentBlocks.flatMap((block) => block.type === "columns" ? [...block.left.blocks, ...block.right.blocks] : [block]);
  const chapterTitles = flat
    .filter((block): block is Extract<BookContentBlock, { type: "text" }> => block.type === "text" && block.structureRole === "chapter")
    .map((block) => block.content.split("\n")[0]?.trim())
    .filter(Boolean)
    .slice(0, 30);
  const imageCount = flat.filter((block) => block.type === "image").length;
  return {
    title: input.title.trim().slice(0, 160),
    description: input.description.trim().slice(0, 500),
    chapterTitles,
    textSample: input.rawText.trim().slice(0, AI_BOOK_DESIGNER_MAX_CONTEXT_SAMPLE),
    imageCount,
    contentBlockCount: input.contentBlocks.length,
    currentDesign: designSpecForState(input.current),
  };
}
