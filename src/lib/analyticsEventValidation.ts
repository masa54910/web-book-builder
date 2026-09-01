import type { ReaderPage } from "@/lib/types";

export const ANALYTICS_EVENT_TYPES = [
  "view_start",
  "reached_25",
  "reached_50",
  "reached_75",
  "completed",
  "share_click",
  "external_link_click",
  "chapter_reached",
  "page_reached",
  "paywall_reached",
] as const;

export type AnalyticsEventType = (typeof ANALYTICS_EVENT_TYPES)[number];

export type AnalyticsEventPayload = {
  bookId: string;
  sessionId: string;
  eventType: string;
  publicationRevision?: number | null;
  readerPageId?: string | null;
  sourceBlockId?: string | null;
  chapterId?: string | null;
  pageIndex?: number | null;
  totalPages?: number | null;
  chapterTitle?: string | null;
  referrerSource?: string | null;
  deviceType?: string | null;
  linkType?: string | null;
};

export type PublishedAnalyticsRegistry = {
  bookId: string;
  publicationRevision: number;
  pages: readonly ReaderPage[];
  chapterIds?: ReadonlySet<string>;
  chapterIdsByTitle?: ReadonlyMap<string, string>;
  paywallBlockIds?: ReadonlySet<string>;
};

export type AnalyticsValidationResult =
  | { ok: true; normalized: AnalyticsEventPayload & { eventType: AnalyticsEventType; publicationRevision: number } }
  | { ok: false; reason: string };

const SAFE_SESSION = /^[A-Za-z0-9._:-]{8,120}$/u;
const LINK_TYPES = new Set(["purchase", "other"]);
const REFERRERS = new Set(["x", "note", "line", "direct", "other"]);
const DEVICES = new Set(["pc", "smartphone", "tablet", "unknown"]);

function optionalString(value: unknown, max = 180) {
  if (value == null || value === "") return null;
  return typeof value === "string" && value.length <= max ? value : undefined;
}

/** Pure validation against the server's published Reader page registry. */
export function validateAnalyticsEventPayload(
  input: AnalyticsEventPayload,
  registry: PublishedAnalyticsRegistry,
): AnalyticsValidationResult {
  if (!input || input.bookId !== registry.bookId) return { ok: false, reason: "book" };
  if (!SAFE_SESSION.test(input.sessionId)) return { ok: false, reason: "session" };
  if (!ANALYTICS_EVENT_TYPES.includes(input.eventType as AnalyticsEventType)) return { ok: false, reason: "event_type" };
  const eventType = input.eventType as AnalyticsEventType;
  const revision = input.publicationRevision == null ? 1 : input.publicationRevision;
  if (!Number.isInteger(revision) || revision !== registry.publicationRevision) return { ok: false, reason: "revision" };

  const readerPageId = optionalString(input.readerPageId);
  const sourceBlockId = optionalString(input.sourceBlockId);
  const chapterId = optionalString(input.chapterId);
  const chapterTitle = optionalString(input.chapterTitle, 300);
  if (readerPageId === undefined || sourceBlockId === undefined || chapterId === undefined || chapterTitle === undefined) {
    return { ok: false, reason: "identifier" };
  }

  const page = readerPageId ? registry.pages.find((candidate) => candidate.id === readerPageId) : undefined;
  if (eventType === "page_reached" || eventType === "paywall_reached") {
    if (!page) return { ok: false, reason: "reader_page" };
  } else if (readerPageId && !page) {
    return { ok: false, reason: "reader_page" };
  }
  if (sourceBlockId) {
    const pageSources = page?.sourceBlockIds || (page?.kind === "paywall" && page.sourceBlockId ? [page.sourceBlockId] : []);
    if (!pageSources.includes(sourceBlockId)) return { ok: false, reason: "source_block" };
  }
  if (chapterId && registry.chapterIds && !registry.chapterIds.has(chapterId)) return { ok: false, reason: "chapter" };
  if (chapterId && page && "chapterTitle" in page && registry.chapterIdsByTitle) {
    const expectedChapterId = registry.chapterIdsByTitle.get(page.chapterTitle);
    if (expectedChapterId && expectedChapterId !== chapterId) return { ok: false, reason: "chapter" };
  }
  if (eventType === "paywall_reached") {
    const paywallIds = registry.paywallBlockIds || new Set<string>();
    if (!page || page.kind !== "paywall" || !sourceBlockId || !paywallIds.has(sourceBlockId)) return { ok: false, reason: "paywall" };
  }

  const pageIndex = input.pageIndex == null ? null : input.pageIndex;
  if (pageIndex !== null && (!Number.isInteger(pageIndex) || pageIndex < 0 || pageIndex >= registry.pages.length)) return { ok: false, reason: "page_index" };
  if (pageIndex !== null && page && registry.pages[pageIndex]?.id !== page.id) return { ok: false, reason: "page_index_mismatch" };
  const totalPages = input.totalPages == null ? null : input.totalPages;
  if (totalPages !== null && (!Number.isInteger(totalPages) || totalPages < 1 || totalPages > 10000)) return { ok: false, reason: "total_pages" };
  const linkType = optionalString(input.linkType, 32);
  if (linkType === undefined || (linkType !== null && !LINK_TYPES.has(linkType))) return { ok: false, reason: "link_type" };
  if (eventType === "external_link_click" && linkType === null) return { ok: false, reason: "link_type_required" };
  if (eventType !== "external_link_click" && linkType !== null) return { ok: false, reason: "link_type" };
  const referrerSource = optionalString(input.referrerSource, 32);
  if (referrerSource === undefined || (referrerSource !== null && !REFERRERS.has(referrerSource))) return { ok: false, reason: "referrer" };
  const deviceType = optionalString(input.deviceType, 32);
  if (deviceType === undefined || (deviceType !== null && !DEVICES.has(deviceType))) return { ok: false, reason: "device" };

  return {
    ok: true,
    normalized: {
      ...input,
      eventType,
      publicationRevision: revision,
      readerPageId,
      sourceBlockId,
      chapterId,
      chapterTitle,
      pageIndex,
      totalPages,
      linkType,
      referrerSource,
      deviceType,
    },
  };
}
