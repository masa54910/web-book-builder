import { flattenContentBlocks, type BookContentBlock } from "@/lib/bookProject";
import { getEditorGuidanceActionDefinition } from "@/lib/editorGuidance/actionRegistry";
import { getEditorHelpActionDefinition } from "@/lib/editorGuidance/actionRegistry";
import type { EditorHelpActionId } from "@/lib/editorGuidance/actionIds";
import type { EditorGuidanceIssue } from "@/lib/editorGuidance/types";
import type { ReaderPage } from "@/lib/types";

export type EditorNavigationResult = "handled" | "not-found" | "unavailable";

function existingBlockIds(contentBlocks: readonly BookContentBlock[]) {
  return new Set(flattenContentBlocks([...contentBlocks]).map((block) => block.id));
}

function pageSourceIds(page: ReaderPage, pages: readonly ReaderPage[]) {
  const sourcePage = page.kind === "pageBreak"
    ? pages.find((candidate) => candidate.id === page.sourcePageId) || page
    : page;
  return "sourceBlockIds" in sourcePage ? sourcePage.sourceBlockIds || [] : [];
}

/** Shared by Mini Preview and Smart Guidance. It never mutates editor data. */
export function resolveReaderPageNavigationTarget(
  page: ReaderPage,
  pages: readonly ReaderPage[],
  contentBlocks: readonly BookContentBlock[],
) {
  const ids = existingBlockIds(contentBlocks);
  const pageIndex = pages.findIndex((candidate) => candidate.id === page.id);
  const directTarget = pageSourceIds(page, pages).find((sourceId) => ids.has(sourceId));
  if (directTarget) return directTarget;

  if (pageIndex >= 0) {
    for (let index = pageIndex + 1; index < pages.length; index += 1) {
      const nextTarget = pageSourceIds(pages[index], pages).find((sourceId) => ids.has(sourceId));
      if (nextTarget) return nextTarget;
    }
  }

  const flatBlocks = flattenContentBlocks([...contentBlocks]);
  const fallbackBlocks = page.kind === "backCover" || page.kind === "colophon"
    ? [...flatBlocks].reverse()
    : flatBlocks;
  return fallbackBlocks[0]?.id;
}

export function resolveGuidanceNavigationTarget(
  issue: EditorGuidanceIssue,
  pages: readonly ReaderPage[],
  contentBlocks: readonly BookContentBlock[],
) {
  const action = getEditorGuidanceActionDefinition(issue.actionId);
  if (!action) return { status: "unavailable" as const };
  const ids = existingBlockIds(contentBlocks);

  if (action.target === "block" || action.target === "paywall") {
    return issue.sourceBlockId && ids.has(issue.sourceBlockId)
      ? { status: "handled" as const, blockId: issue.sourceBlockId }
      : { status: "not-found" as const };
  }

  const page = issue.readerPageId
    ? pages.find((candidate) => candidate.id === issue.readerPageId)
    : undefined;
  const pageTarget = page
    ? resolveReaderPageNavigationTarget(page, pages, contentBlocks)
    : undefined;
  if (pageTarget) return { status: "handled" as const, blockId: pageTarget };

  // Pagination may have changed after the issue was rendered. The canonical
  // block anchor remains the safe fallback when it still exists.
  return issue.sourceBlockId && ids.has(issue.sourceBlockId)
    ? { status: "handled" as const, blockId: issue.sourceBlockId }
    : { status: "not-found" as const };
}

export function resolveHelpBlockNavigationTarget(
  actionId: EditorHelpActionId,
  contentBlocks: readonly BookContentBlock[],
) {
  const action = getEditorHelpActionDefinition(actionId);
  if (!action || (action.target !== "pending-image" && action.target !== "existing-paywall")) {
    return { status: "unavailable" as const };
  }
  const block = flattenContentBlocks([...contentBlocks]).find((candidate) =>
    action.target === "pending-image"
      ? candidate.type === "image" && candidate.uploadState === "pending"
      : candidate.type === "paywall",
  );
  return block
    ? { status: "handled" as const, blockId: block.id }
    : { status: "not-found" as const };
}
