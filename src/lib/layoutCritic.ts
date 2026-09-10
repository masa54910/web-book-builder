import type { BookContentBlock } from "@/lib/bookProject";
import { assignPagePatterns } from "@/lib/pagePatternLibrary";
import { evaluateLayoutSafety, type LayoutSafetyIssue } from "@/lib/layoutSafety";

export type LayoutCriticResult = { passed: boolean; issues: LayoutSafetyIssue[]; repairedPatterns: ReturnType<typeof evaluateLayoutSafety> };

/** Deterministic, API-free critic. It never mutates the supplied blocks. */
export function runRuleBasedLayoutCritic(blocks: readonly BookContentBlock[]): LayoutCriticResult {
  const assignments = assignPagePatterns(blocks);
  const repairedPatterns = evaluateLayoutSafety(blocks, assignments);
  const issues = repairedPatterns.flatMap((item) => item.issues);
  return { passed: issues.length === 0, issues, repairedPatterns };
}
