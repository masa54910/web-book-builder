export type ReaderPageDirection = "next" | "previous";
export type PhysicalFlipMethod = "flipNext" | "flipPrev";

/**
 * Maps logical navigation to the page-flip engine's physical edge.
 *
 * A vertical Japanese book is right-bound: the next logical page is still
 * pageIndex + 1, but the sheet is picked up from the left edge and travels
 * left-to-right. The mapping is intentionally presentation-only; it never
 * reverses canonical page arrays or page identifiers.
 */
export function physicalFlipMethod(
  writingMode: "horizontal-tb" | "vertical-rl" | undefined,
  direction: ReaderPageDirection,
): PhysicalFlipMethod {
  if (writingMode === "vertical-rl") {
    return direction === "next" ? "flipPrev" : "flipNext";
  }
  return direction === "next" ? "flipNext" : "flipPrev";
}

export function verticalSwipeDirection(deltaX: number): ReaderPageDirection {
  return deltaX > 0 ? "next" : "previous";
}
