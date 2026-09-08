export const PUBLICATION_EDIT_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

export type PublicationEditDecisionReason =
  | "unpublished"
  | "free"
  | "operation"
  | "within-window"
  | "window-expired"
  | "missing-first-published-at";

export type PublicationEditDecision = {
  allowed: boolean;
  reason: PublicationEditDecisionReason;
  expiresAt: string | null;
};

export function getPublicationEditDecision(input: {
  status: string;
  firstPublishedAt: string | null | undefined;
  hasActivePublicationEntitlement: boolean;
  hasActiveOperationPlan: boolean;
  now?: Date | string | number;
}): PublicationEditDecision {
  if (input.status !== "published") {
    return { allowed: true, reason: "unpublished", expiresAt: null };
  }
  if (input.hasActiveOperationPlan) {
    return { allowed: true, reason: "operation", expiresAt: null };
  }
  if (!input.hasActivePublicationEntitlement) {
    return { allowed: true, reason: "free", expiresAt: null };
  }

  const firstPublishedAt = input.firstPublishedAt ? Date.parse(input.firstPublishedAt) : Number.NaN;
  if (!Number.isFinite(firstPublishedAt)) {
    return { allowed: false, reason: "missing-first-published-at", expiresAt: null };
  }
  const expiresAt = new Date(firstPublishedAt + PUBLICATION_EDIT_WINDOW_MS).toISOString();
  const now = input.now instanceof Date ? input.now.getTime() : Date.parse(String(input.now ?? new Date().toISOString()));
  const nowMs = Number.isFinite(now) ? now : Date.now();
  return {
    allowed: nowMs < firstPublishedAt + PUBLICATION_EDIT_WINDOW_MS,
    reason: nowMs < firstPublishedAt + PUBLICATION_EDIT_WINDOW_MS ? "within-window" : "window-expired",
    expiresAt,
  };
}
