type AnalyticsPayload = Record<string, string | number | boolean | null | undefined>;

export function trackEvent(eventName: string, payload: AnalyticsPayload = {}) {
  if (typeof window === "undefined") return;
  if (process.env.NEXT_PUBLIC_APP_ENV !== "production") {
    console.info("[analytics]", eventName, { ...payload, at: new Date().toISOString() });
  }
}
