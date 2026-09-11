import type { BookColumnChildBlock } from "@/lib/bookProject";
import type { ReaderColumnChild } from "@/lib/types";

/** A media item occupies a meaningful area, not one character. This is a
 * conservative eligibility estimate, never a claim that measured overflow passed. */
const MEDIA_WEIGHT = 240;
type ColumnItem = BookColumnChildBlock | ReaderColumnChild;

function contentWeight(item: ColumnItem): number {
  if ("type" in item) {
    return item.type === "text" ? item.content.replace(/\s/g, "").length : MEDIA_WEIGHT;
  }
  return item.kind === "text" ? item.paragraphs.join("").replace(/\s/g, "").length : MEDIA_WEIGHT;
}

/** Shared by canonical safety, Mini Preview, Full Preview and Public Reader.
 * Returns presentation only; neither arrays nor their children are changed. */
export function assessColumns(left: readonly ColumnItem[], right: readonly ColumnItem[]) {
  const leftWeight = left.reduce((sum, item) => sum + contentWeight(item), 0);
  const rightWeight = right.reduce((sum, item) => sum + contentWeight(item), 0);
  const reason = !leftWeight || !rightWeight
    ? "empty-column"
    : Math.max(leftWeight, rightWeight) > Math.min(leftWeight, rightWeight) * 4
      ? "unbalanced-columns"
      : null;
  return { fallback: reason !== null, reason, leftWeight, rightWeight } as const;
}
