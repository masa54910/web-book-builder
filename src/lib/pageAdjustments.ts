export type PageAdjustmentImageSize = "small" | "medium" | "large" | "full-width" | "full-page";
export type PageAdjustmentAlign = "left" | "center" | "right";
export type PageAdjustmentPosition = "top" | "center" | "bottom";
export type PageAdjustmentSpacing = "compact" | "normal" | "wide";

/**
 * Presentation-only overrides keyed by a stable Reader page/block id.
 * The original manuscript remains untouched; the renderer applies these
 * values on top of the canonical content when producing a Reader page.
 */
export type PageAdjustment = {
  blockId: string;
  pageBreakBefore?: boolean;
  pageBreakAfter?: boolean;
  paragraphSpacing?: PageAdjustmentSpacing;
  imageSize?: PageAdjustmentImageSize;
  imageAlign?: PageAdjustmentAlign;
  imagePosition?: PageAdjustmentPosition;
  imageSpacingTop?: PageAdjustmentSpacing;
  imageSpacingBottom?: PageAdjustmentSpacing;
  imageHidden?: boolean;
};

const IMAGE_SIZES: PageAdjustmentImageSize[] = ["small", "medium", "large", "full-width", "full-page"];
const ALIGNS: PageAdjustmentAlign[] = ["left", "center", "right"];
const POSITIONS: PageAdjustmentPosition[] = ["top", "center", "bottom"];
const SPACING: PageAdjustmentSpacing[] = ["compact", "normal", "wide"];

function enumValue<T extends string>(value: unknown, values: T[]) {
  return typeof value === "string" && values.includes(value as T) ? (value as T) : undefined;
}

function optionalBoolean(value: unknown) {
  return typeof value === "boolean" ? value : undefined;
}

export function normalizePageAdjustment(value: unknown): PageAdjustment | null {
  if (!value || typeof value !== "object") return null;
  const source = value as Record<string, unknown>;
  const blockId = typeof source.blockId === "string" ? source.blockId.trim() : "";
  if (!blockId) return null;
  return {
    blockId,
    pageBreakBefore: optionalBoolean(source.pageBreakBefore),
    pageBreakAfter: optionalBoolean(source.pageBreakAfter),
    paragraphSpacing: enumValue(source.paragraphSpacing, SPACING),
    imageSize: enumValue(source.imageSize, IMAGE_SIZES),
    imageAlign: enumValue(source.imageAlign, ALIGNS),
    imagePosition: enumValue(source.imagePosition, POSITIONS),
    imageSpacingTop: enumValue(source.imageSpacingTop, SPACING),
    imageSpacingBottom: enumValue(source.imageSpacingBottom, SPACING),
    imageHidden: optionalBoolean(source.imageHidden),
  };
}

export function normalizePageAdjustments(value: unknown): PageAdjustment[] {
  if (!Array.isArray(value)) return [];
  return value
    .map(normalizePageAdjustment)
    .filter((adjustment): adjustment is PageAdjustment => Boolean(adjustment));
}

export function findPageAdjustment(adjustments: PageAdjustment[] | undefined, blockId: string) {
  return (adjustments || []).find((adjustment) => adjustment.blockId === blockId);
}

export function upsertPageAdjustment(
  adjustments: PageAdjustment[] | undefined,
  blockId: string,
  patch: Partial<PageAdjustment>,
) {
  const current = normalizePageAdjustments(adjustments);
  const index = current.findIndex((adjustment) => adjustment.blockId === blockId);
  const next = { ...(index >= 0 ? current[index] : { blockId }), ...patch, blockId };
  if (index >= 0) current[index] = next;
  else current.push(next);
  return current;
}

export function removePageAdjustment(adjustments: PageAdjustment[] | undefined, blockId: string) {
  return normalizePageAdjustments(adjustments).filter((adjustment) => adjustment.blockId !== blockId);
}
