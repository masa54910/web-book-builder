import { DEFAULT_BOOK_DESIGN_SPEC, parseBookDesignSpec, type BookDesignSpec } from "@/lib/designSpec";
import type { ShioriDesignBrief, ShioriCategory } from "@/lib/shioriDesignBrief";

export type BookDesignSystem = {
  id: string;
  name: string;
  categories: ShioriCategory[];
  audienceTags: string[];
  toneTags: string[];
  description: string;
  spec: BookDesignSpec;
  allowedPagePatterns: string[];
  avoidRules: string[];
};

type DesignSpecOverrides = Omit<Partial<BookDesignSpec>, "page" | "typography" | "palette" | "image" | "cover" | "motion"> & {
  page?: Partial<BookDesignSpec["page"]>;
  typography?: Partial<BookDesignSpec["typography"]>;
  palette?: Partial<BookDesignSpec["palette"]>;
  image?: Partial<BookDesignSpec["image"]>;
  cover?: Partial<BookDesignSpec["cover"]>;
  motion?: Partial<BookDesignSpec["motion"]>;
};

const withSpec = (changes: DesignSpecOverrides): BookDesignSpec => ({
  ...DEFAULT_BOOK_DESIGN_SPEC, ...changes,
  typography: { ...DEFAULT_BOOK_DESIGN_SPEC.typography, ...changes.typography },
  palette: { ...DEFAULT_BOOK_DESIGN_SPEC.palette, ...changes.palette },
  page: { ...DEFAULT_BOOK_DESIGN_SPEC.page, ...changes.page, writingMode: "horizontal-tb", bindingDirection: "ltr" },
  image: { ...DEFAULT_BOOK_DESIGN_SPEC.image, ...changes.image },
  cover: { ...DEFAULT_BOOK_DESIGN_SPEC.cover, ...(changes.cover || {}) },
  motion: { ...DEFAULT_BOOK_DESIGN_SPEC.motion, ...(changes.motion || {}) },
});

export const DESIGN_SYSTEM_LIBRARY: readonly BookDesignSystem[] = [
  { id: "EDITORIAL-MODERN", name: "Editorial Modern", categories: ["magazine", "portfolio"], audienceTags: ["幅広い読者"], toneTags: ["都会的でスタイリッシュ"], description: "見出しのメリハリと広い画像面を活かす編集誌型", spec: withSpec({ genre: "magazine", theme: "magazine", page: { pageWidth: "wide", marginScale: "compact", readerMode: "magazine" }, typography: { fontFamily: "gothic", fontScale: "large", lineHeight: "tight" }, image: { layout: "full" }, cover: { layout: "layout-04" } }), allowedPagePatterns: ["h1", "image-text", "quote", "columns"], avoidRules: ["過度な装飾"] },
  { id: "FINANCIAL-EDU", name: "Financial Education", categories: ["education", "business", "research"], audienceTags: ["初心者・はじめての方"], toneTags: ["信頼感のある端正な"], description: "要点と図表を整理して学びやすくする実用書型", spec: withSpec({ genre: "guide", theme: "research", page: { pageWidth: "standard", marginScale: "standard", readerMode: "book" }, typography: { fontFamily: "gothic", fontScale: "medium", lineHeight: "normal" }, image: { layout: "framed" }, cover: { layout: "layout-02" } }), allowedPagePatterns: ["h1", "checklist", "columns", "embed"], avoidRules: ["長い装飾的な前置き"] },
  { id: "LITERARY-PAPERBACK", name: "Literary Paperback", categories: ["novel", "essay"], audienceTags: ["幅広い読者"], toneTags: ["落ち着いた上品な"], description: "明朝体と余白で文章の余韻を支える文芸型", spec: withSpec({ genre: "novel", theme: "novel", page: { pageWidth: "narrow", marginScale: "wide", readerMode: "scroll" }, typography: { fontFamily: "mincho", fontScale: "medium", lineHeight: "relaxed" }, image: { layout: "contained" }, cover: { layout: "layout-01" } }), allowedPagePatterns: ["h1", "chapter-opening", "quote", "image-text"], avoidRules: ["情報過多な列配置"] },
  { id: "PHOTO-GALLERY", name: "Gallery White", categories: ["photo_book", "portfolio"], audienceTags: ["幅広い読者"], toneTags: ["明るく軽やか"], description: "写真を主役に白い余白で作品を見せる写真集型", spec: withSpec({ genre: "photo_book", theme: "photo", page: { pageWidth: "wide", marginScale: "compact", readerMode: "photo", background: "white" }, typography: { fontFamily: "sans", fontScale: "small", lineHeight: "normal" }, image: { layout: "full" }, cover: { layout: "layout-06" } }), allowedPagePatterns: ["image", "image-text", "chapter-opening"], avoidRules: ["本文の過密配置"] },
  { id: "LUXURY-CATALOG", name: "Luxury Catalog", categories: ["portfolio", "other"], audienceTags: ["幅広い読者"], toneTags: ["落ち着いた上品な"], description: "深い色と端正な余白で商品価値を伝えるカタログ型", spec: withSpec({ genre: "catalog", theme: "minimal", page: { pageWidth: "standard", marginScale: "wide", readerMode: "book", background: "ivory" }, typography: { fontFamily: "serif", fontScale: "medium", lineHeight: "relaxed" }, image: { layout: "contained" }, cover: { layout: "layout-08" } }), allowedPagePatterns: ["image-text", "quote", "chapter-opening"], avoidRules: ["派手な色の多用"] },
  { id: "FRIENDLY-GUIDE", name: "Friendly Practical", categories: ["education", "business", "other"], audienceTags: ["初心者・はじめての方", "子ども・学生"], toneTags: ["親しみやすく柔らかい"], description: "短い段落と明るい区切りで気軽に読めるガイド型", spec: withSpec({ genre: "guide", theme: "modern", page: { pageWidth: "standard", marginScale: "standard", readerMode: "scroll", background: "ivory" }, typography: { fontFamily: "sans", fontScale: "large", lineHeight: "relaxed" }, image: { layout: "framed" }, cover: { layout: "layout-03" } }), allowedPagePatterns: ["h1", "checklist", "image-text"], avoidRules: ["専門語の連続"] },
];

export function matchDesignSystems(brief: ShioriDesignBrief, limit = 3) {
  return DESIGN_SYSTEM_LIBRARY.map((system) => {
    const categoryScore = system.categories.includes(brief.category) ? 8 : 0;
    const audienceScore = system.audienceTags.includes(brief.audience) ? 2 : 0;
    const toneScore = system.toneTags.includes(brief.tone) ? 4 : 0;
    const desiredMargin = brief.density === "余白を広くゆったり" ? "wide" : brief.density === "情報をコンパクトに" ? "compact" : "standard";
    const densityScore = system.spec.page.marginScale === desiredMargin ? 2 : 0;
    const imageScore = brief.contentBalance === "画像を主役に"
      ? system.spec.genre === "photo_book" || system.spec.genre === "catalog" ? 3 : 0
      : brief.contentBalance === "文章を主役に"
        ? system.spec.genre === "novel" || system.spec.genre === "guide" ? 3 : 0
        : system.spec.genre === "magazine" ? 3 : 0;
    const brightnessScore = brief.brightness === "明るく軽やか" && system.spec.page.background === "white" ? 1 : 0;
    return { system, categoryScore, audienceScore, toneScore, densityScore, imageScore,
      score: categoryScore + audienceScore + toneScore + densityScore + imageScore + brightnessScore };
  }).sort((a, b) => b.score - a.score || b.categoryScore - a.categoryScore || b.toneScore - a.toneScore
    || b.densityScore - a.densityScore || b.imageScore - a.imageScore
    || a.system.id.localeCompare(b.system.id, "en")).slice(0, Math.max(1, Math.min(5, limit)));
}

export function validateDesignSystemLibrary() {
  const ids = new Set<string>();
  return DESIGN_SYSTEM_LIBRARY.every((system) => !ids.has(system.id) && ids.add(system.id) && parseBookDesignSpec(system.spec).success);
}
