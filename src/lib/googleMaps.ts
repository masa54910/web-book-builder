const GOOGLE_MAP_HOSTS = new Set(["google.com", "www.google.com", "maps.google.com", "google.co.jp", "www.google.co.jp", "maps.google.co.jp"]);

export type GoogleMapsEmbed = { provider: "google_maps"; sourceUrl: string; embedUrl: string };

/** Parse only official HTTPS Google Maps URLs; arbitrary iframe URLs are rejected. */
export function parseGoogleMapsUrl(value: unknown): GoogleMapsEmbed | null {
  if (typeof value !== "string" || !value.trim()) return null;
  try {
    const parsed = new URL(value.trim());
    const host = parsed.hostname.toLowerCase();
    if (parsed.protocol !== "https:" || !GOOGLE_MAP_HOSTS.has(host)) return null;
    if (parsed.username || parsed.password || parsed.hash) return null;
    const path = parsed.pathname.toLowerCase();
    if (!(path === "/maps" || path.startsWith("/maps/"))) return null;
    const sourceUrl = parsed.toString();
    const embedUrl = `https://www.google.com${parsed.pathname}${parsed.search}`;
    return { provider: "google_maps", sourceUrl, embedUrl };
  } catch { return null; }
}

export function isGoogleMapsEmbedUrl(value: unknown): boolean { return Boolean(parseGoogleMapsUrl(value)); }
