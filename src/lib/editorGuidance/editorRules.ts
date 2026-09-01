import type {
  EditorGuidanceIssue,
  EditorGuidanceSeverity,
  EditorGuidanceSnapshot,
} from "@/lib/editorGuidance/types";
import { EDITOR_GUIDANCE_ACTION_IDS } from "@/lib/editorGuidance/actionIds";

/** Pagination charges paragraph/line overhead in addition to raw characters. */
export const TEXT_HEAVY_PAGE_CAPACITY_RATIO = 0.9;
export const TEXT_HEAVY_SEQUENCE_MIN_LENGTH = 2;
/** Only a Paywall before all substantive pages is flagged in the conservative V1 rule. */
export const PAYWALL_MIN_FREE_CONTENT_PAGES = 1;
export const MAX_VISIBLE_EDITOR_GUIDANCE = 3;

const SEVERITY_ORDER: Record<EditorGuidanceSeverity, number> = {
  warning: 0,
  suggestion: 1,
  info: 2,
};

function issueOrder(left: EditorGuidanceIssue, right: EditorGuidanceIssue) {
  return SEVERITY_ORDER[left.severity] - SEVERITY_ORDER[right.severity]
    || (left.documentOrder ?? Number.POSITIVE_INFINITY)
      - (right.documentOrder ?? Number.POSITIVE_INFINITY)
    || left.id.localeCompare(right.id);
}

export function evaluateEditorGuidance(snapshot: EditorGuidanceSnapshot): EditorGuidanceIssue[] {
  const issues: EditorGuidanceIssue[] = [];
  const emptyHeading = snapshot.emptyHeadings[0];
  if (emptyHeading) {
    issues.push({
      id: "heading.empty",
      severity: "warning",
      message: "内容が空の見出しがあります。",
      scope: "heading",
      actionId: EDITOR_GUIDANCE_ACTION_IDS.blockFocus,
      sourceBlockId: emptyHeading.sourceBlockId,
      dismissible: true,
      blocking: false,
      documentOrder: emptyHeading.documentOrder,
    });
  }

  const threshold = Math.ceil(snapshot.charactersPerPage * TEXT_HEAVY_PAGE_CAPACITY_RATIO);
  const heavyPages = snapshot.pages.filter(
    (page) => page.kind === "text" && page.textCharacterCount >= threshold,
  );
  let sequenceStart = -1;
  for (let index = 0; index <= heavyPages.length - TEXT_HEAVY_SEQUENCE_MIN_LENGTH; index += 1) {
    const sequence = heavyPages.slice(index, index + TEXT_HEAVY_SEQUENCE_MIN_LENGTH);
    if (sequence.every((page, sequenceIndex) =>
      sequenceIndex === 0 || page.pageIndex === sequence[sequenceIndex - 1].pageIndex + 1
    )) {
      sequenceStart = index;
      break;
    }
  }

  if (sequenceStart >= 0) {
    const firstPage = heavyPages[sequenceStart];
    issues.push({
      id: "page.text-heavy-sequence",
      severity: "suggestion",
      message: "文章量の多いページが続いています。",
      scope: "page",
      actionId: EDITOR_GUIDANCE_ACTION_IDS.pageFocus,
      sourceBlockId: firstPage.sourceBlockIds[0],
      readerPageId: firstPage.id,
      pageIndex: firstPage.pageIndex,
      dismissible: true,
      blocking: false,
      documentOrder: firstPage.pageIndex,
    });
  } else if (heavyPages[0]) {
    const page = heavyPages[0];
    issues.push({
      id: "page.text-heavy",
      severity: "suggestion",
      message: "このページは文章量が多めです。",
      scope: "page",
      actionId: EDITOR_GUIDANCE_ACTION_IDS.pageFocus,
      sourceBlockId: page.sourceBlockIds[0],
      readerPageId: page.id,
      pageIndex: page.pageIndex,
      dismissible: true,
      blocking: false,
      documentOrder: page.pageIndex,
    });
  }

  if (
    snapshot.paywall
    && snapshot.paywall.readerPageId
    && snapshot.paywall.substantivePagesBefore < PAYWALL_MIN_FREE_CONTENT_PAGES
  ) {
    issues.push({
      id: "paywall.free-section-short",
      severity: "suggestion",
      message: "無料で読める部分が短めです。",
      scope: "paywall",
      actionId: EDITOR_GUIDANCE_ACTION_IDS.paywallFocus,
      sourceBlockId: snapshot.paywall.sourceBlockId,
      readerPageId: snapshot.paywall.readerPageId,
      pageIndex: snapshot.paywall.pageIndex,
      dismissible: true,
      blocking: false,
      documentOrder: snapshot.paywall.pageIndex,
    });
  }

  return issues.sort(issueOrder);
}

export function selectVisibleEditorGuidance(
  issues: readonly EditorGuidanceIssue[],
  maximum = MAX_VISIBLE_EDITOR_GUIDANCE,
) {
  return [...issues].sort(issueOrder).slice(0, Math.max(0, maximum));
}
