import type { BookConfig } from "@/config/bookConfig";
import { normalizeCoverDesign, type CoverDesign, type CoverImageFit, type CoverLayoutId, type CoverPosition } from "@/lib/coverDesign";
import { DEFAULT_BRANDING, DEFAULT_MONETIZATION, type ReaderMode, type ThemeId } from "@/lib/productTypes";
import { mergeThemeSettings, type BookThemeSettings } from "@/lib/themeSystem";

export const DESIGN_SPEC_VERSION = 1 as const;

export type DesignSpecBackground = BookThemeSettings["background"];
export type DesignSpecFontFamily = BookThemeSettings["fontFamily"];
export type DesignSpecFontScale = BookThemeSettings["fontScale"];
export type DesignSpecLineHeight = BookThemeSettings["lineHeight"];
export type DesignSpecMarginScale = BookThemeSettings["marginScale"];
export type DesignSpecPageWidth = BookThemeSettings["pageWidth"];
export type DesignSpecCoverStyle = BookThemeSettings["coverStyle"];
export type DesignSpecImageLayout = BookThemeSettings["imageLayout"];

export type HexColor = string;

export type BookDesignSpec = {
  version: typeof DESIGN_SPEC_VERSION;
  theme: ThemeId;
  typography: {
    fontFamily: DesignSpecFontFamily;
    fontScale: DesignSpecFontScale;
    lineHeight: DesignSpecLineHeight;
  };
  palette: {
    textColor: HexColor;
    accentColor: HexColor;
  };
  page: {
    background: DesignSpecBackground;
    marginScale: DesignSpecMarginScale;
    pageWidth: DesignSpecPageWidth;
    bindingDirection: BookConfig["bindingDirection"];
    readerMode: ReaderMode;
    paragraphSpacing: "compact" | "normal" | "wide";
  };
  cover: {
    coverStyle: DesignSpecCoverStyle;
    layout: CoverLayoutId;
    titlePosition: CoverPosition;
    authorPosition: CoverPosition;
    imagePosition: CoverPosition;
    imageFit: CoverImageFit;
    titleVisible: boolean;
    authorVisible: boolean;
    titleScale: number;
    authorScale: number;
    imageScale: number;
    overlayOpacity: number;
    titleTextOverride?: string;
  };
  image: {
    layout: DesignSpecImageLayout;
  };
  motion: {
    reveal: "none" | "subtle" | "standard";
    reducedMotion: "respect";
  };
};

export type DesignSpecParseResult =
  | { success: true; data: BookDesignSpec }
  | { success: false; error: string };

const THEMES: ThemeId[] = ["classic", "modern", "minimal", "magazine", "novel", "photo", "research", "portfolio"];
const BACKGROUNDS: DesignSpecBackground[] = ["paper", "ivory", "cafe", "night", "green", "white"];
const FONT_FAMILIES: DesignSpecFontFamily[] = ["mincho", "gothic", "serif", "sans"];
const FONT_SCALES: DesignSpecFontScale[] = ["small", "medium", "large"];
const LINE_HEIGHTS: DesignSpecLineHeight[] = ["tight", "normal", "relaxed"];
const MARGINS: DesignSpecMarginScale[] = ["compact", "standard", "wide"];
const WIDTHS: DesignSpecPageWidth[] = ["narrow", "standard", "wide"];
const IMAGE_LAYOUTS: DesignSpecImageLayout[] = ["framed", "full", "contained"];
const READER_MODES: ReaderMode[] = ["book", "scroll", "magazine", "photo"];
const DIRECTIONS: BookConfig["bindingDirection"][] = ["rtl", "ltr"];
const COVER_LAYOUTS: CoverLayoutId[] = Array.from({ length: 10 }, (_, index) => `layout-${String(index + 1).padStart(2, "0")}` as CoverLayoutId);
const POSITIONS: CoverPosition[] = [
  "top-left", "top-center", "top-right", "center-left", "center", "center-right", "bottom-left", "bottom-center", "bottom-right",
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasValue<T extends string>(values: readonly T[], value: unknown): value is T {
  return typeof value === "string" && values.includes(value as T);
}

function isHexColor(value: unknown): value is HexColor {
  return typeof value === "string" && /^#[0-9a-fA-F]{6}$/.test(value);
}

function boundedNumber(value: unknown, min: number, max: number, label: string): string | null {
  if (typeof value !== "number" || !Number.isFinite(value) || value < min || value > max) {
    return `${label} must be a finite number between ${min} and ${max}`;
  }
  return null;
}

function parseCover(value: unknown): BookDesignSpec["cover"] {
  if (!isRecord(value)) throw new Error("cover must be an object");
  if (!hasValue(COVER_LAYOUTS, value.layout)) throw new Error("cover.layout is not allowed");
  if (!hasValue(POSITIONS, value.titlePosition) || !hasValue(POSITIONS, value.authorPosition) || !hasValue(POSITIONS, value.imagePosition)) {
    throw new Error("cover position is not allowed");
  }
  if (value.coverStyle !== "overlay" && value.coverStyle !== "solid" && value.coverStyle !== "band") throw new Error("cover.coverStyle is not allowed");
  if (value.imageFit !== "contain" && value.imageFit !== "cover") throw new Error("cover.imageFit is not allowed");
  for (const [key, min, max] of [["titleScale", 0.3, 1], ["authorScale", 0.7, 1.5], ["imageScale", 0.3, 1], ["overlayOpacity", 0, 0.6]] as const) {
    const error = boundedNumber(value[key], min, max, `cover.${key}`);
    if (error) throw new Error(error);
  }
  if (typeof value.titleVisible !== "boolean" || typeof value.authorVisible !== "boolean") throw new Error("cover visibility must be boolean");
  if (value.titleTextOverride !== undefined && (typeof value.titleTextOverride !== "string" || value.titleTextOverride.length > 120 || /<[^>]*>|[{}]/.test(value.titleTextOverride))) {
    throw new Error("cover.titleTextOverride is not safe");
  }
  return {
    coverStyle: value.coverStyle,
    layout: value.layout,
    titlePosition: value.titlePosition,
    authorPosition: value.authorPosition,
    imagePosition: value.imagePosition,
    imageFit: value.imageFit,
    titleVisible: value.titleVisible,
    authorVisible: value.authorVisible,
    titleScale: value.titleScale as number,
    authorScale: value.authorScale as number,
    imageScale: value.imageScale as number,
    overlayOpacity: value.overlayOpacity as number,
    ...(value.titleTextOverride === undefined ? {} : { titleTextOverride: value.titleTextOverride }),
  };
}

/** Runtime boundary for future AI/preset input. CSS, HTML, class names and unknown enums are rejected. */
export function parseBookDesignSpec(input: unknown): DesignSpecParseResult {
  try {
    if (!isRecord(input)) throw new Error("design spec must be an object");
    if (input.version !== DESIGN_SPEC_VERSION) throw new Error("unsupported design spec version");
    if (!hasValue(THEMES, input.theme)) throw new Error("theme is not allowed");
    const typography = isRecord(input.typography) ? input.typography : null;
    const palette = isRecord(input.palette) ? input.palette : null;
    const page = isRecord(input.page) ? input.page : null;
    const image = isRecord(input.image) ? input.image : null;
    const motion = isRecord(input.motion) ? input.motion : null;
    if (!typography || !palette || !page || !image || !motion) throw new Error("design spec sections are required");
    if (!hasValue(FONT_FAMILIES, typography.fontFamily) || !hasValue(FONT_SCALES, typography.fontScale) || !hasValue(LINE_HEIGHTS, typography.lineHeight)) throw new Error("typography option is not allowed");
    if (!isHexColor(palette.textColor) || !isHexColor(palette.accentColor)) throw new Error("palette colors must be #RRGGBB");
    const paragraphSpacing = page.paragraphSpacing;
    if (!hasValue(BACKGROUNDS, page.background) || !hasValue(MARGINS, page.marginScale) || !hasValue(WIDTHS, page.pageWidth) || !hasValue(DIRECTIONS, page.bindingDirection) || !hasValue(READER_MODES, page.readerMode) || !["compact", "normal", "wide"].includes(paragraphSpacing as string)) throw new Error("page option is not allowed");
    if (!hasValue(IMAGE_LAYOUTS, image.layout)) throw new Error("image.layout is not allowed");
    if (motion.reveal !== "none" && motion.reveal !== "subtle" && motion.reveal !== "standard") throw new Error("motion.reveal is not allowed");
    if (motion.reducedMotion !== "respect") throw new Error("motion.reducedMotion must respect user preference");
    const cover = parseCover(input.cover);
    return { success: true, data: { version: DESIGN_SPEC_VERSION, theme: input.theme, typography: { fontFamily: typography.fontFamily, fontScale: typography.fontScale, lineHeight: typography.lineHeight }, palette: { textColor: palette.textColor, accentColor: palette.accentColor }, page: { background: page.background, marginScale: page.marginScale, pageWidth: page.pageWidth, bindingDirection: page.bindingDirection, readerMode: page.readerMode, paragraphSpacing: paragraphSpacing as BookDesignSpec["page"]["paragraphSpacing"] }, cover, image: { layout: image.layout }, motion: { reveal: motion.reveal, reducedMotion: motion.reducedMotion } } };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "invalid design spec" };
  }
}

export const DEFAULT_BOOK_DESIGN_SPEC: BookDesignSpec = {
  version: DESIGN_SPEC_VERSION,
  theme: "classic",
  typography: { fontFamily: "mincho", fontScale: "medium", lineHeight: "normal" },
  palette: { textColor: "#2f251d", accentColor: "#6bb9ad" },
  page: { background: "paper", marginScale: "standard", pageWidth: "standard", bindingDirection: "rtl", readerMode: "book", paragraphSpacing: "normal" },
  cover: { coverStyle: "overlay", layout: "layout-01", titlePosition: "center-left", authorPosition: "bottom-left", imagePosition: "center", imageFit: "contain", titleVisible: true, authorVisible: true, titleScale: 1, authorScale: 1, imageScale: 1, overlayOpacity: 0 },
  image: { layout: "framed" },
  motion: { reveal: "standard", reducedMotion: "respect" },
};

export const designPresets = { default: DEFAULT_BOOK_DESIGN_SPEC } as const;

/** Read-only adapter: existing persisted BookConfig remains the source of truth. */
export function designSpecFromBookConfig(config: Partial<BookConfig>): BookDesignSpec {
  const theme = hasValue(THEMES, config.theme) ? config.theme : DEFAULT_BOOK_DESIGN_SPEC.theme;
  const settings = mergeThemeSettings(theme, config.themeSettings);
  const cover: CoverDesign = normalizeCoverDesign(config.coverDesign);
  const spec: BookDesignSpec = {
    ...DEFAULT_BOOK_DESIGN_SPEC,
    theme,
    typography: { fontFamily: settings.fontFamily, fontScale: settings.fontScale, lineHeight: settings.lineHeight },
    palette: { textColor: settings.textColor, accentColor: settings.accentColor },
    page: { background: settings.background, marginScale: settings.marginScale, pageWidth: settings.pageWidth, bindingDirection: config.bindingDirection === "ltr" ? "ltr" : "rtl", readerMode: config.readerMode && READER_MODES.includes(config.readerMode) ? config.readerMode : "book", paragraphSpacing: "normal" },
    cover: { coverStyle: settings.coverStyle, layout: cover.layout, titlePosition: cover.titlePosition, authorPosition: cover.authorPosition, imagePosition: cover.imagePosition, imageFit: cover.imageFit, titleVisible: cover.titleVisible !== false, authorVisible: cover.authorVisible !== false, titleScale: cover.titleScale, authorScale: cover.authorScale, imageScale: cover.imageScale, overlayOpacity: cover.overlayOpacity, ...(cover.titleTextOverride ? { titleTextOverride: cover.titleTextOverride } : {}) },
    image: { layout: settings.imageLayout },
  };
  return parseBookDesignSpec(spec).success ? spec : DEFAULT_BOOK_DESIGN_SPEC;
}

export const DESIGN_SPEC_DEFAULTS = {
  monetization: DEFAULT_MONETIZATION,
  branding: DEFAULT_BRANDING,
} as const;
