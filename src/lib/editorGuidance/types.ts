import type { EditorGuidanceActionId } from "@/lib/editorGuidance/actionIds";

export type EditorGuidanceSeverity = "warning" | "suggestion" | "info";

export type EditorGuidanceScope = "book" | "heading" | "page" | "paywall" | "media";

export type EditorGuidanceIssue = {
  /** Stable rule identifier. It must not depend on the localized message. */
  id: string;
  severity: EditorGuidanceSeverity;
  message: string;
  scope: EditorGuidanceScope;
  sourceBlockId?: string;
  readerPageId?: string;
  pageIndex?: number;
  actionId?: EditorGuidanceActionId;
  dismissible: boolean;
  /** Smart Guidance is advisory in Phase S-B and never blocks persistence. */
  blocking: boolean;
  /** Zero-based document position used only for deterministic ordering. */
  documentOrder?: number;
};

export type EditorGuidancePageSnapshot = {
  id: string;
  kind: string;
  pageIndex: number;
  textCharacterCount: number;
  sourceBlockIds: readonly string[];
  substantive: boolean;
};

export type EditorGuidanceEmptyHeading = {
  sourceBlockId: string;
  documentOrder: number;
};

export type EditorGuidancePaywallSnapshot = {
  sourceBlockId: string;
  readerPageId?: string;
  pageIndex?: number;
  substantivePagesBefore: number;
};

export type EditorGuidanceSummary = {
  characterCount: number;
  chapterCount: number;
  headingCount: number;
  pageCount: number;
  imageCount: number;
  youtubeCount: number;
  hasPaywall: boolean;
};

export type EditorGuidanceSnapshot = {
  title: string;
  charactersPerPage: number;
  summary: EditorGuidanceSummary;
  pages: readonly EditorGuidancePageSnapshot[];
  emptyHeadings: readonly EditorGuidanceEmptyHeading[];
  paywall?: EditorGuidancePaywallSnapshot;
  pendingImageCount: number;
};
