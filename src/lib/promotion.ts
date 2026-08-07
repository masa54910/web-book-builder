import type { BookConfig } from "@/config/bookConfig";
import type { SupportedLocale } from "@/lib/localization";
import { buildShareTemplate, buildXShareTemplate } from "@/lib/shareTemplates";

export type PromotionChannel = "x" | "note" | "instagram" | "threads" | "facebook" | "bluesky" | "copy";

export type PromotionAsset = {
  bookId: string;
  shareVersion: number;
  shareUrl: string;
  ogImageUrl: string;
  ogpTitle: string;
  ogpDescription: string;
  hashtags: string[];
  xPost: string;
  noteTitle: string;
  noteBody: string;
};

export function publicBookBaseUrl(origin?: string) {
  const base = origin || process.env.NEXT_PUBLIC_SITE_URL || "https://webbookmaker.vercel.app";
  return `${base.replace(/\/$/, "")}/books/`;
}

function hashtagsFor(config: BookConfig, locale: SupportedLocale) {
  const base = locale === "ja" ? ["Web小説", "創作小説", "WebBookMaker"] : ["WebBook", "Writing", "WebBookMaker"];
  if (config.theme === "research") return [...base, locale === "ja" ? "研究" : "Research"];
  if (config.theme === "photo") return [...base, locale === "ja" ? "旅行記" : "PhotoBook"];
  return base;
}

export function publicBookUrl(slug: string, origin?: string) {
  return `${publicBookBaseUrl(origin)}${slug}`;
}

export function buildPromotionAsset({
  config,
  slug,
  locale = "ja",
  origin,
  shareVersion = 1,
}: {
  config: BookConfig;
  slug: string;
  locale?: SupportedLocale;
  origin?: string;
  shareVersion?: number;
}): PromotionAsset {
  const shareUrl = publicBookUrl(slug, origin);
  const ogImageUrl = `${(origin || process.env.NEXT_PUBLIC_SITE_URL || "").replace(/\/$/, "")}/api/og/book/${encodeURIComponent(slug)}?v=${shareVersion}`;
  const hashtags = hashtagsFor(config, locale);
  const shareDescription = config.description?.trim() || "";
  const description = shareDescription || `${config.author} のWebブックを公開しました。`;
  const hashtagText = hashtags.map((tag) => `#${tag}`).join(" ");
  const xPost = buildXShareTemplate({
    title: config.title,
    description: shareDescription,
    url: shareUrl,
    hashtags,
  });

  const noteTitle = locale === "ja" ? `『${config.title}』を公開しました` : `I published “${config.title}”`;
  const noteBody =
    locale === "ja"
      ? buildShareTemplate({ platform: "note", title: config.title, description: config.description, url: shareUrl })
      : `# ${noteTitle}\n\n${description}\n\nPublished with WebBookMaker as a web book with cover, table of contents, and page-turning reader.\n\n## Read\n${shareUrl}\n\n${hashtagText}`;

  return {
    bookId: config.bookId,
    shareVersion,
    shareUrl,
    ogImageUrl,
    ogpTitle: config.title,
    ogpDescription: description,
    hashtags,
    xPost,
    noteTitle,
    noteBody,
  };
}

export function xIntentUrl(text: string) {
  return `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
}
