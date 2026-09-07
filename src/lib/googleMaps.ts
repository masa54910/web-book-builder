const GOOGLE_MAP_HOSTS = new Set(["google.com", "www.google.com", "maps.google.com", "google.co.jp", "www.google.co.jp", "maps.google.co.jp"]);

export type GoogleMapsEmbed = { provider: "google_maps"; sourceUrl: string; embedUrl: string };

const COORDINATE_PATH = /\/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?),(\d+(?:\.\d+)?)z(?:\/|$)/i;

function embedUrlFor(parsed: URL, sourceUrl: string, path: string) {
  const coordinateMatch = path.match(COORDINATE_PATH);
  if (coordinateMatch) {
    const latitude = Number(coordinateMatch[1]);
    const longitude = Number(coordinateMatch[2]);
    const zoom = Number(coordinateMatch[3]);
    if (Number.isFinite(latitude) && Math.abs(latitude) <= 90 && Number.isFinite(longitude) && Math.abs(longitude) <= 180 && Number.isFinite(zoom) && zoom >= 0 && zoom <= 22) {
      return `https://www.google.com/maps?q=${encodeURIComponent(`${latitude},${longitude}`)}&z=${zoom}&output=embed`;
    }
  }
  const normalizedPath = path.toLowerCase();
  const isOfficialEmbed = normalizedPath.startsWith("/maps/embed") || normalizedPath.startsWith("/maps/d/embed") || parsed.searchParams.get("output") === "embed";
  if (isOfficialEmbed) return `https://www.google.com${parsed.pathname}${parsed.search}`;
  const queryMatch = path.match(/^\/maps\/(?:search|place)\/([^/]+)/i);
  const query = queryMatch ? decodeURIComponent(queryMatch[1]).replace(/\+/g, " ") : sourceUrl;
  return `https://www.google.com/maps?q=${encodeURIComponent(query)}&output=embed`;
}

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
    const embedUrl = embedUrlFor(parsed, sourceUrl, parsed.pathname);
    return { provider: "google_maps", sourceUrl, embedUrl };
  } catch { return null; }
}

export function isGoogleMapsEmbedUrl(value: unknown): boolean { return Boolean(parseGoogleMapsUrl(value)); }
