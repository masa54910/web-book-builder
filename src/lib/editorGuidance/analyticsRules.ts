import { EDITOR_GUIDANCE_ACTION_IDS, EDITOR_HELP_ACTION_IDS } from "@/lib/editorGuidance/actionIds";

export type AnalyticsGuidancePage = {
  readerPageId: string;
  sourceBlockId?: string;
  chapterId?: string;
  pageIndex: number;
  reachCount: number;
  reachRate: number;
  kind?: string;
};

export type AnalyticsGuidancePaywall = {
  readerPageId?: string;
  sourceBlockId: string;
  reachedSessions: number;
  reachRate: number;
};

export type AnalyticsGuidancePurchaseLink = {
  clicks: number;
  rate: number;
};

export type AnalyticsGuidanceSnapshot = {
  totalSessions: number;
  publicationRevision: number;
  pages: readonly AnalyticsGuidancePage[];
  paywall?: AnalyticsGuidancePaywall;
  purchaseLink?: AnalyticsGuidancePurchaseLink;
};

export type AnalyticsGuidanceSuggestion = {
  id: "page-reach-drop" | "paywall-reach-low" | "purchase-link-click-low";
  severity: "suggestion";
  message: string;
  advice: string;
  actionId: string;
  readerPageId?: string;
  sourceBlockId?: string;
  chapterId?: string;
  pageIndex?: number;
  publicationRevision: number;
};

const MIN_SAMPLE = 20;
const DROP_POINTS = 20;
const DROP_RELATIVE = 0.3;
const LOW_PAYWALL_RATE = 0.2;
const LOW_PURCHASE_RATE = 0.1;

function ratio(value: number) {
  return value > 1 ? value / 100 : value;
}

function isNonBodyPage(page: AnalyticsGuidancePage) {
  if (page.kind === "chapterTitle" || page.kind === "contents" || page.kind === "cover" || page.kind === "paywall") return true;
  // Legacy analytics rows do not carry page kind. Deterministic ReaderPage
  // prefixes still let us keep chapter/utility pages out of the body drop rule.
  return /^(chapter-|contents(?:-|$)|cover(?:-|$)|back-cover(?:-|$)|colophon(?:-|$)|paywall-)/u.test(page.readerPageId);
}

/** Pure, conservative V1 analytics suggestions. It never mutates input or performs I/O. */
export function evaluateAnalyticsGuidance(snapshot: AnalyticsGuidanceSnapshot): AnalyticsGuidanceSuggestion[] {
  if (snapshot.totalSessions < MIN_SAMPLE) return [];
  const suggestions: AnalyticsGuidanceSuggestion[] = [];
  const pages = [...snapshot.pages]
    .filter((page) => !isNonBodyPage(page))
    .sort((left, right) => left.pageIndex - right.pageIndex);
  for (let index = 1; index < pages.length; index += 1) {
    const previous = pages[index - 1];
    const current = pages[index];
    const previousRate = ratio(previous.reachRate);
    const currentRate = ratio(current.reachRate);
    const drop = previousRate - currentRate;
    const relativeDrop = previousRate > 0 ? drop / previousRate : 0;
    if (drop * 100 >= DROP_POINTS && relativeDrop >= DROP_RELATIVE) {
      suggestions.push({
        id: "page-reach-drop",
        severity: "suggestion",
        message: `P${current.pageIndex + 1}付近で読者の到達が大きく下がっています。`,
        advice: "文章量や構成を確認してみましょう。",
        actionId: EDITOR_GUIDANCE_ACTION_IDS.pageFocus,
        readerPageId: current.readerPageId,
        sourceBlockId: current.sourceBlockId,
        chapterId: current.chapterId,
        pageIndex: current.pageIndex,
        publicationRevision: snapshot.publicationRevision,
      });
      break;
    }
  }
  if (snapshot.paywall && ratio(snapshot.paywall.reachRate) < LOW_PAYWALL_RATE) {
    suggestions.push({
      id: "paywall-reach-low",
      severity: "suggestion",
      message: "Paywallまで到達する読者が少ない状態です。",
      advice: "無料部分の文章量や構成を確認してみましょう。",
      actionId: EDITOR_GUIDANCE_ACTION_IDS.paywallFocus,
      readerPageId: snapshot.paywall.readerPageId,
      sourceBlockId: snapshot.paywall.sourceBlockId,
      publicationRevision: snapshot.publicationRevision,
    });
  }
  if (snapshot.paywall && snapshot.purchaseLink && ratio(snapshot.purchaseLink.rate) < LOW_PURCHASE_RATE) {
    suggestions.push({
      id: "purchase-link-click-low",
      severity: "suggestion",
      message: "Paywallには到達していますが、購入リンクのクリック率が低めです。",
      advice: "販売文、価格、説明などを確認してみる余地があります。",
      actionId: EDITOR_HELP_ACTION_IDS.externalSalesFocus,
      sourceBlockId: undefined,
      publicationRevision: snapshot.publicationRevision,
    });
  }
  return suggestions.slice(0, 3);
}

export function resolveAnalyticsSuggestionTarget(
  suggestion: Pick<AnalyticsGuidanceSuggestion, "publicationRevision" | "sourceBlockId" | "pageIndex">,
  currentRevision: number,
  existingBlockIds: ReadonlySet<string>,
) {
  const revisionMatches = suggestion.publicationRevision === currentRevision;
  const blockExists = Boolean(suggestion.sourceBlockId && existingBlockIds.has(suggestion.sourceBlockId));
  return {
    revisionMatches,
    blockExists,
    canNavigate: blockExists,
    usesPageIndex: revisionMatches && blockExists ? false : false,
    message: revisionMatches || !blockExists
      ? undefined
      : "このデータは以前の公開版のものです。現在のページ構成とは異なる可能性があります。",
  };
}
