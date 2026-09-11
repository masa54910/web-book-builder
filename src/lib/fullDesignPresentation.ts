import type { BookConfig } from "@/config/bookConfig";
import type { BookContentBlock } from "@/lib/bookProject";
import type { ReaderPage } from "@/lib/types";
import { DESIGN_SYSTEM_LIBRARY } from "@/lib/designSystemLibrary";
import { parseMyDesignGrammar, type MyDesignGrammar } from "@/lib/myDesigns";
import { assignPagePatterns, type PagePatternId } from "@/lib/pagePatternLibrary";
import { safePagePatterns, type SafePatternAssignment } from "@/lib/layoutSafety";
import { assessColumns } from "@/lib/columnsSafety";

export function activeFullDesignGrammar(config: Pick<BookConfig, "designHistory" | "activeDesignVersionId">) {
  const active = config.designHistory?.find((entry) => entry.id === config.activeDesignVersionId && entry.active);
  return active?.fullDesign ? parseMyDesignGrammar(active.fullDesign) : null;
}
export function fullDesignPresentationPlan(blocks: readonly BookContentBlock[], grammar: MyDesignGrammar | null) {
  if (!grammar) return null;
  const system = DESIGN_SYSTEM_LIBRARY.find((entry) => entry.id === grammar.baseSystemId);
  return safePagePatterns(blocks, assignPagePatterns(blocks, system));
}
/** Canonical pages and DOM content remain in their original order. These are
 * presentation attributes only; mixed text pages use the conservative pattern. */
export function fullPatternForPage(page: ReaderPage, plan: readonly SafePatternAssignment[] | null): PagePatternId | undefined {
  if (!plan) return undefined;
  if (page.kind === "cover" || page.kind === "backCover") return "cover";
  if (page.kind === "chapterTitle") return "chapter-opening";
  if (page.kind === "image") return plan.find((item) => page.sourceBlockIds?.includes(item.blockId))?.pattern || "image-text";
  if (page.kind === "columns") {
    const assigned = plan.find((item) => item.blockId === page.columnsBlockId);
    return assessColumns(page.left, page.right).fallback || assigned?.pattern === "standard-text" ? "standard-text" : "editorial-columns";
  }
  if (page.kind !== "text") return undefined;
  const patterns = plan.filter((item) => page.sourceBlockIds?.includes(item.blockId)).map((item) => item.pattern);
  const first = patterns[0];
  return first && patterns.every((pattern) => pattern === first) && !["cover", "chapter-opening", "comparison", "editorial-columns"].includes(first) ? first : "standard-text";
}
