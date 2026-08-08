export type PublicAuthorLinkType = "x" | "note" | "instagram" | "facebook" | "line" | "website" | "other";

export type PublicAuthorLink = {
  label: string;
  url: string;
  linkType: PublicAuthorLinkType;
};

export type PublicAuthorBook = {
  title: string;
  description: string;
  slug: string;
  coverUrl: string;
  updatedAt: string;
};

export type PublicAuthorPageData = {
  profile: {
    displayName: string;
    handle: string;
    bio: string;
    avatarUrl: string;
    websiteUrl: string;
  };
  links: PublicAuthorLink[];
  books: PublicAuthorBook[];
};

export function normalizeAuthorPageHandle(value: string) {
  let decoded = value || "";
  try {
    decoded = decodeURIComponent(decoded);
  } catch {
    // Malformed percent-encoding should resolve to a harmless non-match, not a 500.
  }
  return decoded
    .trim()
    .replace(/^@+/, "")
    .toLowerCase();
}

export function authorPagePath(handle: string) {
  const normalized = normalizeAuthorPageHandle(handle);
  return `/@${encodeURIComponent(normalized)}`;
}

export function authorPageUrl(handle: string, origin?: string) {
  const base = (origin || process.env.NEXT_PUBLIC_SITE_URL || "https://webbookmaker.vercel.app").replace(/\/$/, "");
  return `${base}${authorPagePath(handle)}`;
}
