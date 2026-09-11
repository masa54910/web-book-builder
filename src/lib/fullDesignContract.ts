import { parseBookDesignSpec, type BookDesignSpec } from "@/lib/designSpec";
import { sanitizeBookDesignOverrides } from "@/lib/designPresets";
import { SHIORI_CATEGORY_LABELS, type ShioriDesignBrief, type ShioriCategory } from "@/lib/shioriDesignBrief";

export function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value)
    && (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null);
}

const BRIEF_FIELDS = ["audience", "tone", "contentBalance", "density", "cover", "brightness", "decoration", "emphasis", "avoid"] as const;

/** Strict boundary for browser persistence, requests and saved reusable grammar. */
export function parseFullDesignBrief(value: unknown): ShioriDesignBrief | null {
  if (!isPlainRecord(value) || value.version !== 1
    || typeof value.category !== "string" || !Object.hasOwn(SHIORI_CATEGORY_LABELS, value.category)
    || value.writingMode !== "horizontal-tb" || value.bindingDirection !== "ltr") return null;
  const allowed = new Set(["version", "category", ...BRIEF_FIELDS, "genreDetails", "writingMode", "bindingDirection"]);
  if (Object.keys(value).some((key) => !allowed.has(key))) return null;
  const fields: Record<string, string> = {};
  for (const key of BRIEF_FIELDS) {
    const field = value[key];
    if (typeof field !== "string" || !field.trim() || field.length > 160) return null;
    fields[key] = field.trim();
  }
  if (!isPlainRecord(value.genreDetails) || Object.keys(value.genreDetails).length > 6) return null;
  const genreDetails: Record<string, string> = {};
  for (const [key, field] of Object.entries(value.genreDetails)) {
    if (!Object.hasOwn(SHIORI_CATEGORY_LABELS, key) || typeof field !== "string" || field.length > 200) return null;
    genreDetails[key] = field;
  }
  return {
    version: 1, category: value.category as ShioriCategory,
    audience: fields.audience, tone: fields.tone, contentBalance: fields.contentBalance,
    density: fields.density, cover: fields.cover, brightness: fields.brightness,
    decoration: fields.decoration, emphasis: fields.emphasis, avoid: fields.avoid,
    genreDetails, writingMode: "horizontal-tb", bindingDirection: "ltr",
  };
}

export type FullDesignProfile = {
  title: string; description: string; chapterTitles: string[]; textSample: string;
  imageCount: number; contentBlockCount: number; characterCount: number; pageCount: number;
};
const boundedText = (value: unknown, max: number) => typeof value === "string" ? value.slice(0, max) : "";
const boundedCount = (value: unknown, max: number) => typeof value === "number" && Number.isFinite(value) ? Math.floor(Math.max(0, Math.min(max, value))) : 0;
/** Reconstruct known fields only. No price, identity, assets, HTML or history. */
export function buildFullDesignProfile(value: unknown): FullDesignProfile {
  const input = isPlainRecord(value) ? value : {};
  return {
    title: boundedText(input.title, 160), description: boundedText(input.description, 500),
    chapterTitles: Array.isArray(input.chapterTitles) ? input.chapterTitles.slice(0, 24).map((item) => boundedText(item, 100)) : [],
    textSample: boundedText(input.textSample, 1200),
    imageCount: boundedCount(input.imageCount, 1000), contentBlockCount: boundedCount(input.contentBlockCount, 10000),
    characterCount: boundedCount(input.characterCount, 5000000), pageCount: boundedCount(input.pageCount, 10000),
  };
}

/** Full Design never edits text, including a cover's title override. */
export function mergeFullDesignOverrides(base: BookDesignSpec, raw: unknown): BookDesignSpec | null {
  if (!isPlainRecord(raw) || (isPlainRecord(raw.cover) && Object.hasOwn(raw.cover, "titleTextOverride"))) return null;
  const patch = sanitizeBookDesignOverrides(raw);
  if (!patch) return null;
  if (patch.mood?.density !== undefined && !["compact", "balanced", "airy"].includes(patch.mood.density)) return null;
  if (patch.mood?.keywords !== undefined && (!Array.isArray(patch.mood.keywords) || patch.mood.keywords.length > 12 || patch.mood.keywords.some((word) => typeof word !== "string" || word.length > 40))) return null;
  if (patch.page?.writingMode && patch.page.writingMode !== "horizontal-tb") return null;
  if (patch.page?.bindingDirection && patch.page.bindingDirection !== "ltr") return null;
  const { titleTextOverride: omittedTitle, ...cover } = base.cover;
  void omittedTitle;
  const result = parseBookDesignSpec({
    ...base, ...patch,
    mood: { ...base.mood, ...patch.mood },
    typography: { ...base.typography, ...patch.typography },
    palette: { ...base.palette, ...patch.palette },
    page: { ...base.page, ...patch.page, writingMode: "horizontal-tb", bindingDirection: "ltr" },
    cover: { ...cover, ...patch.cover },
    image: { ...base.image, ...patch.image },
    motion: { ...base.motion, ...patch.motion },
  });
  return result.success ? result.data : null;
}

export const FULL_DESIGN_REQUEST_MAX_BYTES = 24000;
export async function readFullDesignRequest(request: Request): Promise<unknown> {
  const declared = Number(request.headers.get("content-length") || 0);
  if (declared > FULL_DESIGN_REQUEST_MAX_BYTES) throw new Error("request-too-large");
  const reader = request.body?.getReader();
  if (!reader) throw new Error("invalid-request");
  const chunks: Uint8Array[] = [];
  let bytes = 0;
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > FULL_DESIGN_REQUEST_MAX_BYTES) { await reader.cancel(); throw new Error("request-too-large"); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const data = new Uint8Array(bytes);
  let offset = 0;
  for (const chunk of chunks) { data.set(chunk, offset); offset += chunk.byteLength; }
  return JSON.parse(new TextDecoder().decode(data));
}
