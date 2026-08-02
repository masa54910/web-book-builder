"use client";

import type { ReaderPage } from "@/lib/types";
import { getSupabaseClient } from "@/lib/supabase/client";

export type StoredBookAnalytics = {
  bookId: string;
  views: number;
  shares: number;
  completions: number;
  maxPageReached: number;
  totalPages: number;
  chapterViews: Record<string, number>;
  updatedAt: string;
};

export type AnalyticsPeriod = "7d" | "30d" | "all";

export type CloudAnalyticsDetails = {
  views: number;
  uniqueVisitors: number;
  completions: number;
  completionRate: number;
  averageReachedPage: number;
  popularPages: Array<{ page: number; views: number }>;
  popularChapters: Array<{ title: string; views: number }>;
  dropOffPage: number;
  sources: {
    x: number;
    note: number;
    line: number;
    direct: number;
    other: number;
  };
  devices: {
    pc: number;
    smartphone: number;
    tablet: number;
    unknown: number;
  };
  dailyTrend: Array<{ date: string; views: number }>;
};

const ANALYTICS_KEY_PREFIX = "webBookMaker:analytics:";
const ANALYTICS_SESSION_KEY_PREFIX = "webBookMaker:analyticsSession:";
const ANALYTICS_EVENT_DEDUPE_PREFIX = "webBookMaker:analyticsSent:";

type CloudReaderEvent =
  | "view_start"
  | "reached_25"
  | "reached_50"
  | "reached_75"
  | "completed"
  | "share_click"
  | "external_link_click"
  | "chapter_reached";

type DeviceType = "pc" | "smartphone" | "tablet" | "unknown";

function detectDeviceType(): DeviceType {
  if (typeof window === "undefined") return "unknown";
  const ua = navigator.userAgent.toLowerCase();
  const width = window.innerWidth;
  if (/ipad|tablet|sm-t|kindle/.test(ua) || (width >= 768 && width <= 1180)) return "tablet";
  if (/iphone|android|mobile/.test(ua) || width < 768) return "smartphone";
  if (width > 1180) return "pc";
  return "unknown";
}

function normalizeReferrerSource(referrer: string): "x" | "note" | "line" | "direct" | "other" {
  if (!referrer) return "direct";
  const value = referrer.toLowerCase();
  if (value.includes("x.com") || value.includes("twitter.com")) return "x";
  if (value.includes("note.com")) return "note";
  if (value.includes("line.me") || value.includes("line-apps.com")) return "line";
  return "other";
}

function emptyAnalytics(bookId: string): StoredBookAnalytics {
  return {
    bookId,
    views: 0,
    shares: 0,
    completions: 0,
    maxPageReached: 0,
    totalPages: 0,
    chapterViews: {},
    updatedAt: new Date().toISOString(),
  };
}

function storageKey(bookId: string) {
  return `${ANALYTICS_KEY_PREFIX}${bookId}`;
}

function analyticsSessionId(cloudBookId: string) {
  const key = `${ANALYTICS_SESSION_KEY_PREFIX}${cloudBookId}`;
  try {
    const existing = sessionStorage.getItem(key);
    if (existing) return existing;
    const next = crypto.randomUUID();
    sessionStorage.setItem(key, next);
    return next;
  } catch {
    return `session-${Math.random().toString(36).slice(2)}`;
  }
}

function dedupeKey(cloudBookId: string, eventType: CloudReaderEvent, chapterTitle?: string) {
  return `${ANALYTICS_EVENT_DEDUPE_PREFIX}${cloudBookId}:${eventType}:${chapterTitle ?? ""}`;
}

async function recordCloudEvent(
  cloudBookId: string | undefined,
  eventType: CloudReaderEvent,
  payload: Record<string, unknown> = {},
  once = true,
) {
  if (typeof window === "undefined" || !cloudBookId) return;
  const supabase = getSupabaseClient();
  if (!supabase) return;
  const key = dedupeKey(cloudBookId, eventType, typeof payload.chapterTitle === "string" ? payload.chapterTitle : undefined);
  try {
    if (once && localStorage.getItem(key)) return;
    const insertPayload = {
      book_id: cloudBookId,
      session_id: analyticsSessionId(cloudBookId),
      event_type: eventType,
      chapter_title: typeof payload.chapterTitle === "string" ? payload.chapterTitle : null,
      page_index: typeof payload.pageIndex === "number" ? payload.pageIndex : null,
      total_pages: typeof payload.totalPages === "number" ? payload.totalPages : null,
      referrer_source: typeof payload.referrerSource === "string" ? payload.referrerSource : null,
      device_type: typeof payload.deviceType === "string" ? payload.deviceType : null,
    };
    let { error } = await supabase.from("book_analytics_events").insert(insertPayload);
    if (error) {
      // Fallback for environments where analytics dimension columns are not migrated yet.
      const fallback = await supabase.from("book_analytics_events").insert({
        book_id: cloudBookId,
        session_id: analyticsSessionId(cloudBookId),
        event_type: eventType,
        chapter_title: typeof payload.chapterTitle === "string" ? payload.chapterTitle : null,
        page_index: typeof payload.pageIndex === "number" ? payload.pageIndex : null,
        total_pages: typeof payload.totalPages === "number" ? payload.totalPages : null,
      });
      error = fallback.error;
    }
    if (!error && once) localStorage.setItem(key, new Date().toISOString());
  } catch {
    // Cloud analytics must never interrupt reading.
  }
}

function read(bookId: string) {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(storageKey(bookId)) ?? "null");
    if (typeof parsed === "object" && parsed !== null && (parsed as StoredBookAnalytics).bookId === bookId) {
      return { ...emptyAnalytics(bookId), ...(parsed as StoredBookAnalytics) };
    }
  } catch {
    // Ignore broken browser storage.
  }
  return emptyAnalytics(bookId);
}

function write(analytics: StoredBookAnalytics) {
  try {
    localStorage.setItem(
      storageKey(analytics.bookId),
      JSON.stringify({ ...analytics, updatedAt: new Date().toISOString() }),
    );
  } catch {
    // Analytics is non-critical.
  }
}

export function readBookAnalytics(bookId: string) {
  if (typeof window === "undefined") return emptyAnalytics(bookId);
  return read(bookId);
}

export function recordBookView(bookId: string, cloudBookId?: string) {
  if (typeof window === "undefined") return;
  const analytics = read(bookId);
  analytics.views += 1;
  write(analytics);
  const referrerSource = normalizeReferrerSource(document.referrer || "");
  void recordCloudEvent(cloudBookId, "view_start", {
    referrerSource,
    deviceType: detectDeviceType(),
  });
}

export function recordShare(bookId: string, cloudBookId?: string) {
  if (typeof window === "undefined") return;
  const analytics = read(bookId);
  analytics.shares += 1;
  write(analytics);
  void recordCloudEvent(cloudBookId, "share_click", {}, false);
}

export function recordExternalLinkClick(bookId: string, cloudBookId?: string) {
  if (typeof window === "undefined") return;
  void bookId;
  void recordCloudEvent(cloudBookId, "external_link_click", {}, false);
}

export function recordReaderProgress(bookId: string, page: ReaderPage | undefined, pageIndex: number, totalPages: number, cloudBookId?: string) {
  if (typeof window === "undefined" || !page) return;
  const analytics = read(bookId);
  analytics.maxPageReached = Math.max(analytics.maxPageReached, pageIndex);
  analytics.totalPages = Math.max(analytics.totalPages, totalPages);
  if ("chapterTitle" in page) {
    analytics.chapterViews[page.chapterTitle] = (analytics.chapterViews[page.chapterTitle] ?? 0) + 1;
    void recordCloudEvent(
      cloudBookId,
      "chapter_reached",
      { chapterTitle: page.chapterTitle, pageIndex, totalPages },
    );
  }
  const progress = totalPages > 0 ? pageIndex / Math.max(1, totalPages - 1) : 0;
  if (progress >= 0.25) void recordCloudEvent(cloudBookId, "reached_25", { pageIndex, totalPages });
  if (progress >= 0.5) void recordCloudEvent(cloudBookId, "reached_50", { pageIndex, totalPages });
  if (progress >= 0.75) void recordCloudEvent(cloudBookId, "reached_75", { pageIndex, totalPages });
  if (totalPages > 0 && pageIndex >= totalPages - 2) {
    analytics.completions += 1;
    void recordCloudEvent(cloudBookId, "completed", { pageIndex, totalPages });
  }
  write(analytics);
}

export function summarizeAnalytics(bookId: string) {
  const analytics = readBookAnalytics(bookId);
  const completionRate = analytics.views
    ? Math.round((analytics.completions / analytics.views) * 100)
    : 0;
  const popularChapters = Object.entries(analytics.chapterViews)
    .sort((left, right) => right[1] - left[1])
    .slice(0, 5)
    .map(([title, views]) => ({ title, views }));
  return { ...analytics, completionRate, popularChapters };
}

export async function summarizeCloudAnalytics(cloudBookId: string) {
  const supabase = getSupabaseClient();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("book_analytics_events")
    .select("event_type, chapter_title")
    .eq("book_id", cloudBookId)
    .limit(5000);
  if (error) throw error;
  const rows = (data ?? []) as Array<{ event_type: string; chapter_title: string | null }>;
  const views = rows.filter((row) => row.event_type === "view_start").length;
  const completions = rows.filter((row) => row.event_type === "completed").length;
  const shares = rows.filter((row) => row.event_type === "share_click").length;
  const externalLinkClicks = rows.filter((row) => row.event_type === "external_link_click").length;
  const chapterViews = new Map<string, number>();
  for (const row of rows) {
    if (row.event_type !== "chapter_reached" || !row.chapter_title) continue;
    chapterViews.set(row.chapter_title, (chapterViews.get(row.chapter_title) ?? 0) + 1);
  }
  return {
    views,
    completions,
    completionRate: views ? Math.round((completions / views) * 100) : 0,
    shares,
    externalLinkClicks,
    popularChapters: [...chapterViews.entries()]
      .sort((left, right) => right[1] - left[1])
      .slice(0, 5)
      .map(([title, count]) => ({ title, views: count })),
  };
}

export async function summarizeCloudAnalyticsDetailed(cloudBookId: string, period: AnalyticsPeriod) {
  const supabase = getSupabaseClient();
  if (!supabase) return null;

  const now = new Date();
  const startAt =
    period === "7d"
      ? new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()
      : period === "30d"
        ? new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString()
        : null;

  let query = supabase
    .from("book_analytics_events")
    .select("event_type, chapter_title, page_index, total_pages, session_id, created_at, referrer_source, device_type")
    .eq("book_id", cloudBookId)
    .order("created_at", { ascending: true })
    .limit(10000);
  if (startAt) query = query.gte("created_at", startAt);

  const base = await query;
  let data = base.data;
  let error = base.error;
  if (error && error.message.toLowerCase().includes("referrer_source")) {
    let fallbackQuery = supabase
      .from("book_analytics_events")
      .select("event_type, chapter_title, page_index, total_pages, session_id, created_at")
      .eq("book_id", cloudBookId)
      .order("created_at", { ascending: true })
      .limit(10000);
    if (startAt) fallbackQuery = fallbackQuery.gte("created_at", startAt);
    const fallback = await fallbackQuery;
    data = (fallback.data ?? []).map((row) => ({
      ...row,
      referrer_source: null,
      device_type: null,
    }));
    error = fallback.error;
  }
  if (error) throw error;

  const rows = (data ?? []) as Array<{
    event_type: string;
    chapter_title: string | null;
    page_index: number | null;
    total_pages: number | null;
    session_id: string;
    created_at: string;
    referrer_source?: string | null;
    device_type?: DeviceType | null;
  }>;

  const sourceCount = { x: 0, note: 0, line: 0, direct: 0, other: 0 };
  const deviceCount: CloudAnalyticsDetails["devices"] = { pc: 0, smartphone: 0, tablet: 0, unknown: 0 };
  const chapterCount = new Map<string, number>();
  const pageCount = new Map<number, number>();
  const dailyCount = new Map<string, number>();
  const uniqueVisitors = new Set<string>();
  const sessionProgress = new Map<string, { maxPage: number; completed: boolean; lastPage: number }>();

  let views = 0;
  let completions = 0;

  for (const row of rows) {
    const day = row.created_at.slice(0, 10);
    dailyCount.set(day, (dailyCount.get(day) ?? 0) + (row.event_type === "view_start" ? 1 : 0));

    const current = sessionProgress.get(row.session_id) ?? { maxPage: 0, completed: false, lastPage: 0 };
    if (typeof row.page_index === "number" && row.page_index >= 0) {
      const page = row.page_index + 1;
      current.maxPage = Math.max(current.maxPage, page);
      current.lastPage = page;
      pageCount.set(page, (pageCount.get(page) ?? 0) + 1);
    }
    if (row.event_type === "completed") {
      current.completed = true;
    }
    sessionProgress.set(row.session_id, current);

    if (row.event_type === "view_start") {
      views += 1;
      uniqueVisitors.add(row.session_id);
      const sourceKey = row.referrer_source === "x" || row.referrer_source === "note" || row.referrer_source === "line" || row.referrer_source === "direct" ? row.referrer_source : "other";
      sourceCount[sourceKey] += 1;
      const deviceKey = row.device_type === "pc" || row.device_type === "smartphone" || row.device_type === "tablet" ? row.device_type : "unknown";
      deviceCount[deviceKey] += 1;
    }
    if (row.event_type === "completed") {
      completions += 1;
    }
    if (row.event_type === "chapter_reached" && row.chapter_title) {
      chapterCount.set(row.chapter_title, (chapterCount.get(row.chapter_title) ?? 0) + 1);
    }
  }

  let dropOffPage = 0;
  const dropOffCount = new Map<number, number>();
  let reachedPageTotal = 0;
  let reachedPageSessions = 0;

  for (const summary of sessionProgress.values()) {
    if (summary.maxPage > 0) {
      reachedPageTotal += summary.maxPage;
      reachedPageSessions += 1;
    }
    if (!summary.completed && summary.lastPage > 0) {
      dropOffCount.set(summary.lastPage, (dropOffCount.get(summary.lastPage) ?? 0) + 1);
    }
  }

  for (const [page, count] of dropOffCount.entries()) {
    if ((dropOffCount.get(dropOffPage) ?? 0) < count) {
      dropOffPage = page;
    }
  }

  const popularPages = [...pageCount.entries()]
    .sort((left, right) => right[1] - left[1])
    .slice(0, 5)
    .map(([page, count]) => ({ page, views: count }));
  const popularChapters = [...chapterCount.entries()]
    .sort((left, right) => right[1] - left[1])
    .slice(0, 5)
    .map(([title, count]) => ({ title, views: count }));

  const dailyTrend = [...dailyCount.entries()]
    .filter(([, count]) => count > 0)
    .sort((left, right) => left[0].localeCompare(right[0]))
    .map(([date, value]) => ({ date, views: value }));

  const result: CloudAnalyticsDetails = {
    views,
    uniqueVisitors: uniqueVisitors.size,
    completions,
    completionRate: views ? Math.round((completions / views) * 100) : 0,
    averageReachedPage: reachedPageSessions ? Number((reachedPageTotal / reachedPageSessions).toFixed(1)) : 0,
    popularPages,
    popularChapters,
    dropOffPage,
    sources: sourceCount,
    devices: deviceCount,
    dailyTrend,
  };

  return result;
}
