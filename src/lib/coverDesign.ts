export type CoverLayoutId =
  | "layout-01"
  | "layout-02"
  | "layout-03"
  | "layout-04"
  | "layout-05"
  | "layout-06"
  | "layout-07"
  | "layout-08"
  | "layout-09"
  | "layout-10";

export type CoverPosition =
  | "top-left"
  | "top-center"
  | "top-right"
  | "center-left"
  | "center"
  | "center-right"
  | "bottom-left"
  | "bottom-center"
  | "bottom-right";

export type CoverImageFit = "contain" | "cover";

export type CoverDesign = {
  layout: CoverLayoutId;
  /** Optional line-broken title used only by the cover renderer. */
  titleTextOverride?: string;
  titleScale: number;
  titlePosition: CoverPosition;
  authorScale: number;
  authorPosition: CoverPosition;
  imageScale: number;
  imageFit: CoverImageFit;
  imagePosition: CoverPosition;
  overlayOpacity: number;
};

export type CoverLayoutOption = {
  id: CoverLayoutId;
  label: string;
  description: string;
};

export const COVER_LAYOUT_OPTIONS: CoverLayoutOption[] = [
  { id: "layout-01", label: "01 スタンダード", description: "タイトル・画像・作者名" },
  { id: "layout-02", label: "02 タイトル中央", description: "中央揃えで強調" },
  { id: "layout-03", label: "03 写真全面", description: "画像全面＋文字" },
  { id: "layout-04", label: "04 写真上部", description: "画像を上部へ" },
  { id: "layout-05", label: "05 写真下部", description: "画像を下部へ" },
  { id: "layout-06", label: "06 タイトル大型", description: "文字を大きく" },
  { id: "layout-07", label: "07 ミニマル", description: "余白を活かす" },
  { id: "layout-08", label: "08 左寄せ", description: "左基準の構成" },
  { id: "layout-09", label: "09 右寄せ", description: "右基準の構成" },
  { id: "layout-10", label: "10 ビジュアル作品", description: "画像を主役に" },
];

export const COVER_POSITIONS: CoverPosition[] = [
  "top-left",
  "top-center",
  "top-right",
  "center-left",
  "center",
  "center-right",
  "bottom-left",
  "bottom-center",
  "bottom-right",
];

export const DEFAULT_COVER_DESIGN: CoverDesign = {
  // Layout 01 intentionally mirrors the current cover renderer.
  layout: "layout-01",
  titleTextOverride: undefined,
  titleScale: 1,
  titlePosition: "center-left",
  authorScale: 1,
  authorPosition: "bottom-left",
  imageScale: 1,
  imageFit: "contain",
  imagePosition: "center",
  overlayOpacity: 0,
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function clamp(value: unknown, min: number, max: number, fallback: number) {
  const numeric = typeof value === "number" && Number.isFinite(value) ? value : fallback;
  return Math.min(max, Math.max(min, numeric));
}

function validLayout(value: unknown): value is CoverLayoutId {
  return COVER_LAYOUT_OPTIONS.some((option) => option.id === value);
}

function validPosition(value: unknown): value is CoverPosition {
  return COVER_POSITIONS.includes(value as CoverPosition);
}

export const MAX_COVER_TITLE_OVERRIDE_LINES = 4;
export const MAX_COVER_TITLE_OVERRIDE_LENGTH = 120;

/** Normalize user-entered cover-only title line breaks without changing book.title. */
export function normalizeCoverTitleOverride(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;

  const normalized = value.replace(/\r\n?/g, "\n").trim();
  if (!normalized) return undefined;

  const limitedLines = normalized
    .split("\n")
    .slice(0, MAX_COVER_TITLE_OVERRIDE_LINES)
    .map((line) => line.trim());
  const compact = limitedLines.join("\n").replace(/\n{3,}/g, "\n\n");
  const limited = compact.slice(0, MAX_COVER_TITLE_OVERRIDE_LENGTH).trim();
  return limited || undefined;
}

/** Normalize persisted/legacy values without changing existing cover defaults. */
export function normalizeCoverDesign(value: unknown): CoverDesign {
  const source = isRecord(value) ? value : {};
  return {
    layout: validLayout(source.layout) ? source.layout : DEFAULT_COVER_DESIGN.layout,
    titleTextOverride: normalizeCoverTitleOverride(source.titleTextOverride),
    titleScale: clamp(source.titleScale, 0.7, 1.5, DEFAULT_COVER_DESIGN.titleScale),
    titlePosition: validPosition(source.titlePosition)
      ? source.titlePosition
      : DEFAULT_COVER_DESIGN.titlePosition,
    authorScale: clamp(source.authorScale, 0.7, 1.5, DEFAULT_COVER_DESIGN.authorScale),
    authorPosition: validPosition(source.authorPosition)
      ? source.authorPosition
      : DEFAULT_COVER_DESIGN.authorPosition,
    imageScale: clamp(source.imageScale, 0.7, 1.5, DEFAULT_COVER_DESIGN.imageScale),
    imageFit: source.imageFit === "cover" ? "cover" : DEFAULT_COVER_DESIGN.imageFit,
    imagePosition: validPosition(source.imagePosition)
      ? source.imagePosition
      : DEFAULT_COVER_DESIGN.imagePosition,
    overlayOpacity: clamp(source.overlayOpacity, 0, 0.6, DEFAULT_COVER_DESIGN.overlayOpacity),
  };
}

export function positionToObjectPosition(position: CoverPosition) {
  const [vertical, horizontal = "center"] = position === "center" ? ["center", "center"] : position.split("-");
  return `${horizontal} ${vertical}`;
}

export function positionToTextAlign(position: CoverPosition): "left" | "center" | "right" {
  if (position.endsWith("right")) return "right";
  if (position.endsWith("left")) return "left";
  return "center";
}

export function positionToJustifyContent(position: CoverPosition) {
  if (position.startsWith("top")) return "flex-start";
  if (position.startsWith("bottom")) return "flex-end";
  return "center";
}

export function positionToAlignItems(position: CoverPosition) {
  if (position.endsWith("left")) return "flex-start";
  if (position.endsWith("right")) return "flex-end";
  return "center";
}
