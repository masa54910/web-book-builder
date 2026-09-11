export type LayoutGeometry = { width: number; height: number; scrollWidth: number; scrollHeight: number };
/** Pixel measurements are separate from token/content heuristics. Hidden flip
 * pages are unmeasured, never incorrectly declared safe from a zero rectangle. */
export function evaluateLayoutGeometry(size: LayoutGeometry) {
  if (size.width <= 0 || size.height <= 0) return { measured: false, overflow: false };
  return { measured: true, overflow: size.scrollWidth > size.width + 2 || size.scrollHeight > size.height + 2 };
}
