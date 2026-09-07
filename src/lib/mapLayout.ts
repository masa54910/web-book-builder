import { parseGoogleMapsUrl } from "./googleMaps";

export type MapAlignment = "left" | "center" | "right";

export function normalizeMapAlignment(value: unknown): MapAlignment {
  return value === "left" || value === "right" ? value : "center";
}

export const INLINE_MAP_TOKEN_PREFIX = "[[inline-map:";

export function createInlineMapToken(sourceUrl: string, alignment: MapAlignment) {
  return `${INLINE_MAP_TOKEN_PREFIX}${encodeURIComponent(JSON.stringify({ sourceUrl, alignment }))}]]`;
}

export function parseInlineMapToken(value: string) {
  if (!value.startsWith(INLINE_MAP_TOKEN_PREFIX) || !value.endsWith("]]")) return null;
  try {
    const data = JSON.parse(decodeURIComponent(value.slice(INLINE_MAP_TOKEN_PREFIX.length, -2)));
    const map = typeof data?.sourceUrl === "string" ? parseGoogleMapsUrl(data.sourceUrl) : null;
    return map ? { ...map, alignment: normalizeMapAlignment(data.alignment), displaySize: "small" as const } : null;
  } catch { return null; }
}
