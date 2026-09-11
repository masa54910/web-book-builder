import type { BookContentBlock } from "@/lib/bookProject";
import type { PagePatternAssignment, PagePatternId } from "@/lib/pagePatternLibrary";
import { assessColumns } from "@/lib/columnsSafety";

export type LayoutSafetyIssue = { blockId: string; kind: "empty-column" | "unbalanced-columns" | "atomic-block" | "image-overflow" | "orphan-heading" | "paywall-boundary"; message: string };
export type SafePatternAssignment = PagePatternAssignment & { fallback?: PagePatternId; issues: LayoutSafetyIssue[] };

export function evaluateLayoutSafety(blocks: readonly BookContentBlock[], assignments: readonly PagePatternAssignment[]): SafePatternAssignment[] {
  const byId = new Map(blocks.map((block) => [block.id, block]));
  return assignments.map((assignment, index) => {
    const block = byId.get(assignment.blockId);
    const issues: LayoutSafetyIssue[] = [];
    let fallback: PagePatternId | undefined;
    if (!block) return { ...assignment, issues };
    if (block.type === "columns") {
      const assessment = assessColumns(block.left.blocks, block.right.blocks);
      if (assessment.reason) {
        issues.push({ blockId: block.id, kind: assessment.reason, message: assessment.reason === "empty-column" ? "左右どちらかのColumnが空です" : "Columnの内容量差が大きすぎます" });
        fallback = "standard-text";
      }
    }
    if (block.type === "image" && (block.width <= 0 || block.height <= 0)) { issues.push({ blockId: block.id, kind: "image-overflow", message: "画像サイズが不正です" }); fallback = "standard-text"; }
    if (assignment.pattern === "chapter-opening" && index > 0 && assignments[index - 1]?.pattern === "chapter-opening") issues.push({ blockId: block.id, kind: "orphan-heading", message: "章見出しが連続しています" });
    // Atomic media and paywalls are invariants, not failures merely by existing.
    return { ...assignment, issues, ...(fallback && { fallback }) };
  });
}

export function safePagePatterns(blocks: readonly BookContentBlock[], assignments: readonly PagePatternAssignment[]) {
  return evaluateLayoutSafety(blocks, assignments).map((item) => item.fallback ? { ...item, pattern: item.fallback } : item);
}
