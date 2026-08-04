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
  return normalized || "book";
}

export function isValidSlug(slug: string) {
  return /^[a-z0-9](?:[a-z0-9-]{0,78}[a-z0-9])?$/.test(
    slug,
  );
}

export function validateSlug(slug: string) {
  const normalized = normalizeSlugInput(slug);
  if (!normalized) return "";
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
