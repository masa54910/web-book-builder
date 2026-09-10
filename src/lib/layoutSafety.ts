import type { BookContentBlock, BookColumnChildBlock } from "@/lib/bookProject";
import type { PagePatternAssignment, PagePatternId } from "@/lib/pagePatternLibrary";

export type LayoutSafetyIssue = { blockId: string; kind: "empty-column" | "unbalanced-columns" | "atomic-block" | "image-overflow" | "orphan-heading" | "paywall-boundary"; message: string };
export type SafePatternAssignment = PagePatternAssignment & { fallback?: PagePatternId; issues: LayoutSafetyIssue[] };

function childContent(block: BookColumnChildBlock) {
  if (block.type === "text") return block.content.trim().length;
  return 1;
}
function columnWeight(block: Extract<BookContentBlock, { type: "columns" }>) {
  return [block.left.blocks, block.right.blocks].map((items) => items.reduce((sum, item) => sum + childContent(item), 0));
}
function isAtomic(block: BookContentBlock) { return block.type === "image" || block.type === "youtube" || block.type === "map"; }

export function evaluateLayoutSafety(blocks: readonly BookContentBlock[], assignments: readonly PagePatternAssignment[]): SafePatternAssignment[] {
  const byId = new Map(blocks.map((block) => [block.id, block]));
  return assignments.map((assignment, index) => {
    const block = byId.get(assignment.blockId);
    const issues: LayoutSafetyIssue[] = [];
    let fallback: PagePatternId | undefined;
    if (!block) return { ...assignment, issues };
    if (block.type === "columns") {
      const [left, right] = columnWeight(block);
      if (!left || !right) { issues.push({ blockId: block.id, kind: "empty-column", message: "左右どちらかのColumnが空です" }); fallback = "standard-text"; }
      else if (Math.max(left, right) > Math.min(left, right) * 4) { issues.push({ blockId: block.id, kind: "unbalanced-columns", message: "Columnの内容量差が大きすぎます" }); fallback = "standard-text"; }
      if (block.left.blocks.some(isAtomic) || block.right.blocks.some(isAtomic)) issues.push({ blockId: block.id, kind: "atomic-block", message: "Column内のatomic blockは分割しません" });
    }
    if (block.type === "image" && (block.width <= 0 || block.height <= 0)) { issues.push({ blockId: block.id, kind: "image-overflow", message: "画像サイズが不正です" }); fallback = "standard-text"; }
    if (assignment.pattern === "chapter-opening" && index > 0 && assignments[index - 1]?.pattern === "chapter-opening") issues.push({ blockId: block.id, kind: "orphan-heading", message: "章見出しが連続しています" });
    if (block.type === "paywall" || (block as { type: string }).type === "paywall") issues.push({ blockId: block.id, kind: "paywall-boundary", message: "Paywall境界は移動・統合しません" });
    return { ...assignment, issues, ...(fallback && { fallback }) };
  });
}

export function safePagePatterns(blocks: readonly BookContentBlock[], assignments: readonly PagePatternAssignment[]) {
  return evaluateLayoutSafety(blocks, assignments).map((item) => item.fallback ? { ...item, pattern: item.fallback } : item);
}
