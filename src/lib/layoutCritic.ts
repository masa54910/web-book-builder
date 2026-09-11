import type { BookContentBlock } from "@/lib/bookProject";
import { assignPagePatterns } from "@/lib/pagePatternLibrary";
import { safePagePatterns, type LayoutSafetyIssue } from "@/lib/layoutSafety";

export type LayoutCriticResult = { passed: boolean; issues: LayoutSafetyIssue[]; repairedPatterns: ReturnType<typeof safePagePatterns> };

/** Deterministic, API-free critic. It never mutates the supplied blocks. */
export function runRuleBasedLayoutCritic(blocks: readonly BookContentBlock[]): LayoutCriticResult {
  const assignments = assignPagePatterns(blocks);
  const repairedPatterns = safePagePatterns(blocks, assignments);
  const issues = repairedPatterns.flatMap((item) => item.issues);
  return { passed: issues.length === 0, issues, repairedPatterns };
}
