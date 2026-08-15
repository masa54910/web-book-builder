import { BETA_LIMITS } from "./limits";

export function normalizeSlugInput(value: string) {
  return value
    .normalize("NFKC")
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export function createSlugCandidate(value: string) {
  const normalized = normalizeSlugInput(value);
  // Production's books_slug_check requires at least three characters.
  return normalized.length >= 3 ? normalized : "book";
}

function randomSlugToken() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID().replace(/-/g, "").slice(0, 10);
  }
  return Math.random().toString(36).slice(2, 12);
}

/**
 * Build a new-book slug without falling back to a shared fixed value.
 * Titles that contain no usable ASCII slug characters receive an entropy
 * suffix so that two new books can never start from the same fallback.
 */
export function createNewBookSlugCandidate(value: string) {
  const normalized = normalizeSlugInput(value);
  return normalized.length >= 3 ? normalized : `work-${randomSlugToken()}`;
}

export function isValidSlug(slug: string) {
  // Keep client validation aligned with the production constraint.
  return /^[a-z0-9][a-z0-9-]{1,78}[a-z0-9]$/.test(
    slug,
  );
}

export function validateSlug(slug: string) {
  const normalizedInput = slug.normalize("NFKC").toLowerCase();
  if (!normalizedInput.trim()) return "";
  if (!/^[a-z0-9-]+$/.test(normalizedInput)) {
    return "公開URLは半角英数字とハイフンで入力してください。";
  }
  const normalized = normalizeSlugInput(normalizedInput);
  if (!isValidSlug(normalized)) return "公開URLは半角英小文字・半角数字・ハイフンで入力してください。";
  if (BETA_LIMITS.reservedSlugs.includes(normalized as never)) {
    return "このURLはシステムで予約されています。別のURLを指定してください。";
  }
  return "";
}

export function makeUniqueSlug(base: string, used: Set<string>) {
  const candidate = createSlugCandidate(base);
  let slug = candidate;
  let suffix = 2;
  while (used.has(slug)) {
    slug = `${candidate}-${suffix}`;
    suffix += 1;
  }
  return slug;
}
