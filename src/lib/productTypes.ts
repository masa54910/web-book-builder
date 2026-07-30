export type ThemeId =
  | "classic"
  | "modern"
  | "minimal"
  | "magazine"
  | "novel"
  | "photo"
  | "research"
  | "portfolio";

export type ReaderMode = "book" | "scroll" | "magazine" | "photo";

export type AccessLevel = "free" | "external" | "password" | "access-code";

export type PreviewUnit = "none" | "chapters" | "pages" | "percent";

export type Monetization = {
  enabled: boolean;
  accessLevel: AccessLevel;
  externalSalesUrl?: string;
  externalSalesLabel?: string;
  previewUnit: PreviewUnit;
  previewValue?: number;
};

export type ExternalLinkType =
  | "kindle"
  | "note"
  | "website"
  | "blog"
  | "youtube"
  | "course"
  | "newsletter"
  | "contact"
  | "support"
  | "booth"
  | "base"
  | "stores"
  | "other";

export type ExternalLink = {
  id: string;
  type: ExternalLinkType;
  label: string;
  url: string;
};

export type AuthorProfile = {
  handle: string;
  displayName: string;
  bio: string;
  avatarUrl?: string;
  websiteUrl?: string;
  snsLinks: ExternalLink[];
  representativeBookId?: string;
  updatedAt?: string;
};

export type BookAnalyticsSummary = {
  views: number;
  shares: number;
  completions: number;
  completionRate: number;
  popularChapters: Array<{
    title: string;
    views: number;
  }>;
  updatedAt?: string;
};

export type BookVersion = {
  id: string;
  label: string;
  note: string;
  createdAt: string;
};

export type BrandingSettings = {
  showCreatedWithWebBookMaker: boolean;
  plan: "free" | "plus";
};

export type PricingPlan = {
  id: "free" | "plus";
  name: string;
  priceLabel: string;
  features: string[];
};

export const PRICING_PLANS: PricingPlan[] = [
  {
    id: "free",
    name: "Free",
    priceLabel: "¥0",
    features: ["20ページまで", "公開URL", "作者ページ", "基本テーマ", "SNS共有"],
  },
  {
    id: "plus",
    name: "Plus",
    priceLabel: "準備中",
    features: ["ページ無制限", "ブランド削除", "追加テーマ", "高度解析", "高画質動画", "追加動画テンプレート"],
  },
];

export const DEFAULT_MONETIZATION: Monetization = {
  enabled: false,
  accessLevel: "free",
  previewUnit: "none",
};

export const DEFAULT_BRANDING: BrandingSettings = {
  showCreatedWithWebBookMaker: true,
  plan: "free",
};

export function normalizeHandle(value: string, fallback: string) {
  const normalized =
    value
      .trim()
      .replace(/^@+/, "")
      .normalize("NFKC")
      .toLowerCase()
      .replace(/[^a-z0-9_-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || fallback;
  return normalized;
}

export function safeExternalUrl(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (/[\u0000-\u001f\u007f\s]/.test(trimmed)) return "";
  try {
    const url = new URL(trimmed);
    if (url.username || url.password) return "";
    if (url.protocol === "https:") return url.toString();
    if (
      process.env.NODE_ENV === "development" &&
      url.protocol === "http:" &&
      (url.hostname === "localhost" || url.hostname === "127.0.0.1")
    ) {
      return url.toString();
    }
    return "";
  } catch {
    return "";
  }
}
