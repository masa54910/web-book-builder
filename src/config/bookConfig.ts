import type {
  AuthorProfile,
  BookAnalyticsSummary,
  BookVersion,
  BrandingSettings,
  ExternalLink,
  Monetization,
  ReaderMode,
  ThemeId,
} from "@/lib/productTypes";
import type { SupportedLocale } from "@/lib/localization";
import type { BookThemeSettings } from "@/lib/themeSystem";

export type BindingDirection = "rtl" | "ltr";
export type BookTheme = ThemeId;
export type BookPublicationStatus = "draft" | "published" | "archived";
export type BookPublicationVisibility = "private" | "unlisted" | "public";

export type BookConfig = {
  bookId: string;
  /** Canonical public slug carried through Preview/BookProject conversion. */
  slug?: string;
  /** Canonical publication state carried through Preview/BookProject conversion. */
  publication?: {
    status: BookPublicationStatus;
    visibility: BookPublicationVisibility;
  };
  title: string;
  displayTitleLines?: string[];
  subtitle: string;
  author: string;
  description: string;
  language: SupportedLocale;
  coverImage?: string;
  /** Runtime-only HTTP URL for the cover. Never persist signed URLs. */
  coverImageUrl?: string;
  bindingDirection: BindingDirection;
  theme: BookTheme;
  themeSettings?: Partial<BookThemeSettings>;
  tableOfContentsItemsPerPage: number;
  charactersPerPage: number;
  publisherName: string;
  publishedAt: string;
  copyrightText: string;
  readerMode?: ReaderMode;
  authorProfile?: AuthorProfile;
  externalLinks?: ExternalLink[];
  monetization?: Monetization;
  analyticsSummary?: BookAnalyticsSummary;
  versions?: BookVersion[];
  branding?: BrandingSettings;
};

export const bookConfig: BookConfig = {
  bookId: "star-town-records",
  title: "星降る町の小さな記録",
  subtitle: "Static Web Book Template",
  author: "Sample Author",
  description: "テキストと設定を差し替えてWeb雑誌・デジタル書籍を生成するためのサンプル作品です。",
  language: "ja",
  bindingDirection: "rtl",
  theme: "classic",
  tableOfContentsItemsPerPage: 6,
  charactersPerPage: 380,
  publisherName: "Web Book Builder",
  publishedAt: "2026",
  copyrightText: "Sample text created for web book preview testing.",
  readerMode: "book",
  externalLinks: [],
  branding: {
    showCreatedWithWebBookMaker: true,
    plan: "free",
  },
};
