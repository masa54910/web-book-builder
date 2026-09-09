import { DEFAULT_BOOK_DESIGN_SPEC, parseBookDesignSpec, type BookDesignSpec, type DesignSpecParseResult } from "@/lib/designSpec";
import type { BookTheme } from "@/config/bookConfig";

export type BookDesignPresetCategory = "magazine" | "business" | "novel" | "photo" | "education" | "catalog";

export type BookDesignPreset = {
  id: string;
  name: string;
  category: BookDesignPresetCategory;
  description: string;
  keywords: string[];
  bestFor: string[];
  visualTraits: string[];
  spec: BookDesignSpec;
};

export type BookDesignSpecOverrides = Partial<{
  genre: BookDesignSpec["genre"];
  mood: Partial<BookDesignSpec["mood"]>;
  theme: BookDesignSpec["theme"];
  typography: Partial<BookDesignSpec["typography"]>;
  palette: Partial<BookDesignSpec["palette"]>;
  page: Partial<BookDesignSpec["page"]>;
  cover: Partial<BookDesignSpec["cover"]>;
  image: Partial<BookDesignSpec["image"]>;
  motion: Partial<BookDesignSpec["motion"]>;
}>;

type SpecOverrides = {
  genre?: BookDesignSpec["genre"];
  mood?: Partial<BookDesignSpec["mood"]>;
  theme?: BookTheme;
  typography?: Partial<BookDesignSpec["typography"]>;
  palette?: Partial<BookDesignSpec["palette"]>;
  page?: Partial<BookDesignSpec["page"]>;
  cover?: Partial<BookDesignSpec["cover"]>;
  image?: Partial<BookDesignSpec["image"]>;
  motion?: Partial<BookDesignSpec["motion"]>;
};

function makeSpec(overrides: SpecOverrides): BookDesignSpec {
  return {
    ...DEFAULT_BOOK_DESIGN_SPEC,
    ...overrides,
    mood: { ...DEFAULT_BOOK_DESIGN_SPEC.mood, ...overrides.mood },
    typography: { ...DEFAULT_BOOK_DESIGN_SPEC.typography, ...overrides.typography },
    palette: { ...DEFAULT_BOOK_DESIGN_SPEC.palette, ...overrides.palette },
    page: { ...DEFAULT_BOOK_DESIGN_SPEC.page, ...overrides.page },
    cover: { ...DEFAULT_BOOK_DESIGN_SPEC.cover, ...overrides.cover },
    image: { ...DEFAULT_BOOK_DESIGN_SPEC.image, ...overrides.image },
    motion: { ...DEFAULT_BOOK_DESIGN_SPEC.motion, ...overrides.motion },
  };
}

function preset(
  id: string,
  name: string,
  category: BookDesignPresetCategory,
  description: string,
  keywords: string[],
  bestFor: string[],
  visualTraits: string[],
  overrides: SpecOverrides,
): BookDesignPreset {
  return { id, name, category, description, keywords, bestFor, visualTraits, spec: makeSpec(overrides) };
}

export const BOOK_DESIGN_PRESETS: BookDesignPreset[] = [
  preset("MAG-01", "Editorial Modern", "magazine", "都会的で洗練された編集誌の基本形。", ["雑誌", "都会的", "スタイリッシュ", "モダン"], ["ファッション", "インタビュー", "特集"], ["明るい余白", "広い本文", "サンセリフ"], { genre: "magazine", theme: "modern", typography: { fontFamily: "sans", fontScale: "medium", lineHeight: "normal" }, palette: { textColor: "#1f2a35", accentColor: "#3f88c5" }, page: { background: "ivory", marginScale: "standard", pageWidth: "wide", readerMode: "magazine", paragraphSpacing: "normal" }, cover: { coverStyle: "solid", layout: "layout-02", titlePosition: "top-left", authorPosition: "bottom-right", imagePosition: "center", imageFit: "cover", imageScale: 1, overlayOpacity: 0.12 }, image: { layout: "contained" }, motion: { reveal: "subtle" } }),
  preset("MAG-02", "Business Magazine", "magazine", "経済誌のような信頼感と情報密度。", ["経済誌", "ビジネス誌", "信頼感", "分析"], ["経済", "企業", "市場解説"], ["濃紺アクセント", "タイトな行間", "ゴシック"], { genre: "magazine", theme: "research", typography: { fontFamily: "gothic", fontScale: "small", lineHeight: "tight" }, palette: { textColor: "#23303b", accentColor: "#4a708b" }, page: { background: "white", marginScale: "standard", pageWidth: "wide", readerMode: "magazine", paragraphSpacing: "compact" }, cover: { coverStyle: "band", layout: "layout-08", titlePosition: "center-left", authorPosition: "bottom-left", imagePosition: "top-right", imageFit: "contain", titleScale: 0.9, overlayOpacity: 0 }, image: { layout: "contained" }, motion: { reveal: "standard" } }),
  preset("MAG-03", "Lifestyle Magazine", "magazine", "暮らしの記事に合う柔らかく温かな誌面。", ["暮らし", "女性誌", "柔らかい", "ライフスタイル"], ["料理", "日常", "インタビュー"], ["珈琲色", "明朝見出し", "写真を活かす"], { genre: "magazine", theme: "magazine", typography: { fontFamily: "mincho", fontScale: "medium", lineHeight: "relaxed" }, palette: { textColor: "#3a281e", accentColor: "#d58a2a" }, page: { background: "cafe", marginScale: "standard", pageWidth: "standard", readerMode: "magazine", paragraphSpacing: "wide" }, cover: { coverStyle: "overlay", layout: "layout-04", titlePosition: "bottom-left", authorPosition: "bottom-right", imagePosition: "top-center", imageFit: "cover", titleScale: 0.95, imageScale: 1, overlayOpacity: 0.22 }, image: { layout: "full" }, motion: { reveal: "subtle" } }),
  preset("MAG-04", "Bold Feature", "magazine", "特集の主役を強く見せる大胆な誌面。", ["特集", "強い見出し", "メリハリ", "大胆"], ["巻頭特集", "キャンペーン", "人物紹介"], ["夜背景", "全面画像", "大きなタイトル"], { genre: "magazine", theme: "magazine", typography: { fontFamily: "sans", fontScale: "large", lineHeight: "tight" }, palette: { textColor: "#f2efe8", accentColor: "#84d5c8" }, page: { background: "night", marginScale: "compact", pageWidth: "wide", readerMode: "magazine", paragraphSpacing: "compact" }, cover: { coverStyle: "solid", layout: "layout-03", titlePosition: "center", authorPosition: "bottom-right", imagePosition: "center", imageFit: "cover", titleScale: 1, authorScale: 0.8, imageScale: 1, overlayOpacity: 0.28 }, image: { layout: "full" }, motion: { reveal: "standard" } }),
  preset("MAG-05", "Minimal Editorial", "magazine", "余白と静かな階層で読ませる現代的な編集デザイン。", ["ミニマル", "余白", "上品", "編集"], ["コラム", "レビュー", "短編特集"], ["細い本文", "狭い本文幅", "静かな配色"], { genre: "magazine", theme: "minimal", typography: { fontFamily: "serif", fontScale: "small", lineHeight: "relaxed" }, palette: { textColor: "#2a2926", accentColor: "#9e7b50" }, page: { background: "paper", marginScale: "wide", pageWidth: "narrow", readerMode: "magazine", paragraphSpacing: "wide" }, cover: { coverStyle: "band", layout: "layout-07", titlePosition: "center", authorPosition: "bottom-center", imagePosition: "bottom-right", imageFit: "contain", titleScale: 0.85, authorScale: 0.8, imageScale: 0.8, overlayOpacity: 0 }, image: { layout: "framed" }, motion: { reveal: "subtle" } }),

  preset("BUS-01", "Professional", "business", "実用書としての信頼性と読みやすさを両立。", ["実用書", "ビジネス", "信頼感", "仕事"], ["営業", "業務改善", "経営"], ["標準幅", "ゴシック", "安定した余白"], { genre: "guide", theme: "modern", typography: { fontFamily: "gothic", fontScale: "medium", lineHeight: "normal" }, palette: { textColor: "#1f2a35", accentColor: "#3f88c5" }, page: { background: "ivory", marginScale: "standard", pageWidth: "standard", readerMode: "book", paragraphSpacing: "normal" }, cover: { coverStyle: "solid", layout: "layout-01", titlePosition: "center-left", authorPosition: "bottom-left", imagePosition: "center", imageFit: "contain", overlayOpacity: 0.08 }, image: { layout: "contained" }, motion: { reveal: "subtle" } }),
  preset("BUS-02", "Executive", "business", "経営者向けの高級感と落ち着きを備えた設計。", ["高級感", "経営", "コンサル", "エグゼクティブ"], ["経営戦略", "ブランド", "提案書"], ["白背景", "セリフ", "広い余白"], { genre: "guide", theme: "portfolio", typography: { fontFamily: "serif", fontScale: "large", lineHeight: "relaxed" }, palette: { textColor: "#1f362f", accentColor: "#2a7f69" }, page: { background: "white", marginScale: "wide", pageWidth: "wide", readerMode: "book", paragraphSpacing: "wide" }, cover: { coverStyle: "solid", layout: "layout-09", titlePosition: "top-right", authorPosition: "bottom-left", imagePosition: "center-left", imageFit: "cover", titleScale: 0.95, authorScale: 0.8, imageScale: 0.9, overlayOpacity: 0.1 }, image: { layout: "contained" }, motion: { reveal: "subtle" } }),
  preset("BUS-03", "Friendly Practical", "business", "初心者にも親しみやすい実用書の基本形。", ["初心者", "読みやすい", "やさしい", "実用"], ["入門書", "ハウツー", "生活改善"], ["紙背景", "明朝とサンの中間", "柔らかな行間"], { genre: "guide", theme: "classic", typography: { fontFamily: "sans", fontScale: "medium", lineHeight: "relaxed" }, palette: { textColor: "#2f251d", accentColor: "#6bb9ad" }, page: { background: "paper", marginScale: "standard", pageWidth: "standard", readerMode: "scroll", paragraphSpacing: "wide" }, cover: { coverStyle: "overlay", layout: "layout-05", titlePosition: "top-left", authorPosition: "bottom-right", imagePosition: "bottom-center", imageFit: "contain", imageScale: 0.9, overlayOpacity: 0.12 }, image: { layout: "framed" }, motion: { reveal: "subtle" } }),
  preset("BUS-04", "Data & Research", "business", "調査資料や分析レポート向けの高密度な設計。", ["調査", "データ", "研究", "レポート"], ["白書", "分析", "市場調査"], ["タイトな行間", "広い本文", "情報密度"], { genre: "guide", theme: "research", typography: { fontFamily: "gothic", fontScale: "small", lineHeight: "tight" }, palette: { textColor: "#23303b", accentColor: "#4a708b" }, page: { background: "paper", marginScale: "standard", pageWidth: "wide", readerMode: "scroll", paragraphSpacing: "compact" }, cover: { coverStyle: "band", layout: "layout-06", titlePosition: "top-left", authorPosition: "bottom-right", imagePosition: "center-right", imageFit: "contain", titleScale: 0.9, overlayOpacity: 0 }, image: { layout: "contained" }, motion: { reveal: "none" } }),
  preset("BUS-05", "Startup Modern", "business", "IT・SaaSの速度感を表現するモダンな設計。", ["スタートアップ", "IT", "SaaS", "現代的"], ["プロダクト", "起業", "技術ビジネス"], ["グリーン背景", "ワイド幅", "全面画像"], { genre: "guide", theme: "modern", typography: { fontFamily: "sans", fontScale: "medium", lineHeight: "normal" }, palette: { textColor: "#1f362f", accentColor: "#2a7f69" }, page: { background: "green", marginScale: "compact", pageWidth: "wide", readerMode: "magazine", paragraphSpacing: "normal" }, cover: { coverStyle: "solid", layout: "layout-10", titlePosition: "center-left", authorPosition: "bottom-right", imagePosition: "top-right", imageFit: "cover", imageScale: 1, overlayOpacity: 0.16 }, image: { layout: "full" }, motion: { reveal: "standard" } }),

  preset("NOV-01", "Japanese Paperback", "novel", "文庫本のような明朝体と落ち着いた長文設計。", ["文庫本", "小説", "明朝", "落ち着き"], ["長編小説", "短編", "物語"], ["大きめ明朝", "ゆったりした行間", "紙色"], { genre: "novel", theme: "novel", typography: { fontFamily: "mincho", fontScale: "large", lineHeight: "relaxed" }, palette: { textColor: "#33261d", accentColor: "#8f6a42" }, page: { background: "ivory", marginScale: "wide", pageWidth: "standard", readerMode: "book", paragraphSpacing: "wide" }, cover: { coverStyle: "overlay", layout: "layout-01", titlePosition: "center-left", authorPosition: "bottom-left", imagePosition: "center", imageFit: "contain", titleScale: 1, overlayOpacity: 0.08 }, image: { layout: "framed" }, motion: { reveal: "none" } }),
  preset("NOV-02", "Literary", "novel", "文学作品やエッセイに合う余白の深い静かな設計。", ["文学", "エッセイ", "余白", "静か"], ["随筆", "詩", "文学作品"], ["狭い本文", "セリフ", "長い行間"], { genre: "novel", theme: "minimal", typography: { fontFamily: "serif", fontScale: "medium", lineHeight: "relaxed" }, palette: { textColor: "#2a2926", accentColor: "#9e7b50" }, page: { background: "paper", marginScale: "wide", pageWidth: "narrow", readerMode: "book", paragraphSpacing: "wide" }, cover: { coverStyle: "band", layout: "layout-07", titlePosition: "center", authorPosition: "bottom-center", imagePosition: "center", imageFit: "contain", titleScale: 0.9, authorScale: 0.8, imageScale: 0.7, overlayOpacity: 0 }, image: { layout: "contained" }, motion: { reveal: "subtle" } }),
  preset("NOV-03", "Modern Novel", "novel", "現代小説を軽やかに読むためのシンプルな設計。", ["現代小説", "シンプル", "読みやすい", "現代"], ["Web小説", "連載", "短編"], ["白背景", "サンセリフ", "スクロール"], { genre: "novel", theme: "modern", typography: { fontFamily: "sans", fontScale: "medium", lineHeight: "normal" }, palette: { textColor: "#1f2a35", accentColor: "#3f88c5" }, page: { background: "white", marginScale: "standard", pageWidth: "standard", readerMode: "scroll", paragraphSpacing: "normal" }, cover: { coverStyle: "solid", layout: "layout-02", titlePosition: "center", authorPosition: "bottom-right", imagePosition: "center", imageFit: "cover", titleScale: 0.95, overlayOpacity: 0.06 }, image: { layout: "contained" }, motion: { reveal: "subtle" } }),
  preset("NOV-04", "Warm Essay", "novel", "日記やエッセイに合う、やわらかな温度のデザイン。", ["日記", "エッセイ", "柔らかい", "温かい"], ["個人記録", "暮らし", "手記"], ["珈琲色", "明朝", "広い行間"], { genre: "novel", theme: "classic", typography: { fontFamily: "mincho", fontScale: "medium", lineHeight: "relaxed" }, palette: { textColor: "#3a281e", accentColor: "#d58a2a" }, page: { background: "cafe", marginScale: "wide", pageWidth: "standard", readerMode: "book", paragraphSpacing: "wide" }, cover: { coverStyle: "overlay", layout: "layout-05", titlePosition: "top-left", authorPosition: "bottom-right", imagePosition: "bottom-center", imageFit: "contain", imageScale: 0.85, overlayOpacity: 0.1 }, image: { layout: "framed" }, motion: { reveal: "subtle" } }),

  preset("PHO-01", "Gallery White", "photo", "白いギャラリーのように写真を主役にする設計。", ["写真集", "白背景", "ギャラリー", "写真主役"], ["作品集", "写真展示", "ポートフォリオ"], ["白背景", "全面画像", "ワイド幅"], { genre: "photo_book", theme: "photo", typography: { fontFamily: "sans", fontScale: "medium", lineHeight: "normal" }, palette: { textColor: "#2a2926", accentColor: "#9e7b50" }, page: { background: "white", marginScale: "compact", pageWidth: "wide", readerMode: "photo", paragraphSpacing: "compact" }, cover: { coverStyle: "solid", layout: "layout-03", titlePosition: "bottom-left", authorPosition: "bottom-right", imagePosition: "center", imageFit: "cover", titleScale: 0.85, imageScale: 1, overlayOpacity: 0.12 }, image: { layout: "full" }, motion: { reveal: "subtle" } }),
  preset("PHO-02", "Gallery Dark", "photo", "暗いギャラリーで写真の色を引き立てる設計。", ["写真集", "黒", "ダーク", "ギャラリー"], ["夜景", "アート写真", "作品展示"], ["夜背景", "全面画像", "高コントラスト"], { genre: "photo_book", theme: "photo", typography: { fontFamily: "sans", fontScale: "medium", lineHeight: "normal" }, palette: { textColor: "#f2efe8", accentColor: "#84d5c8" }, page: { background: "night", marginScale: "compact", pageWidth: "wide", readerMode: "photo", paragraphSpacing: "compact" }, cover: { coverStyle: "solid", layout: "layout-10", titlePosition: "top-left", authorPosition: "bottom-right", imagePosition: "center", imageFit: "cover", titleScale: 0.9, imageScale: 1, overlayOpacity: 0.2 }, image: { layout: "full" }, motion: { reveal: "standard" } }),
  preset("PHO-03", "Travel Journal", "photo", "旅の写真と文章を自然に組み合わせる設計。", ["旅行記", "旅", "写真", "日誌"], ["旅行", "地域紹介", "旅エッセイ"], ["アイボリー", "セリフ", "写真と本文"], { genre: "photo_book", theme: "magazine", typography: { fontFamily: "serif", fontScale: "medium", lineHeight: "relaxed" }, palette: { textColor: "#3a281e", accentColor: "#d58a2a" }, page: { background: "ivory", marginScale: "standard", pageWidth: "standard", readerMode: "magazine", paragraphSpacing: "wide" }, cover: { coverStyle: "overlay", layout: "layout-04", titlePosition: "bottom-left", authorPosition: "bottom-right", imagePosition: "top-center", imageFit: "cover", overlayOpacity: 0.15 }, image: { layout: "full" }, motion: { reveal: "subtle" } }),
  preset("PHO-04", "Minimal Portfolio", "photo", "作品そのものを邪魔しない静かなポートフォリオ。", ["作品集", "ポートフォリオ", "ミニマル", "デザイン"], ["デザイン作品", "建築", "イラスト"], ["グリーン背景", " contained画像", "静かな余白"], { genre: "photo_book", theme: "portfolio", typography: { fontFamily: "serif", fontScale: "medium", lineHeight: "normal" }, palette: { textColor: "#1f362f", accentColor: "#2a7f69" }, page: { background: "green", marginScale: "wide", pageWidth: "wide", readerMode: "photo", paragraphSpacing: "normal" }, cover: { coverStyle: "solid", layout: "layout-09", titlePosition: "top-right", authorPosition: "bottom-left", imagePosition: "center", imageFit: "contain", imageScale: 0.9, overlayOpacity: 0 }, image: { layout: "contained" }, motion: { reveal: "subtle" } }),

  preset("EDU-01", "Textbook Clean", "education", "教材のように情報を整理して読める設計。", ["教材", "教科書", "読みやすい", "整理"], ["授業", "学習教材", "講座"], ["白背景", "タイトな行間", "ワイド本文"], { genre: "guide", theme: "research", typography: { fontFamily: "gothic", fontScale: "small", lineHeight: "tight" }, palette: { textColor: "#23303b", accentColor: "#4a708b" }, page: { background: "white", marginScale: "standard", pageWidth: "wide", readerMode: "scroll", paragraphSpacing: "compact" }, cover: { coverStyle: "band", layout: "layout-08", titlePosition: "top-left", authorPosition: "bottom-right", imagePosition: "center-right", imageFit: "contain", titleScale: 0.9, overlayOpacity: 0 }, image: { layout: "contained" }, motion: { reveal: "none" } }),
  preset("EDU-02", "Step Guide", "education", "手順を順に追える親切なHow-to設計。", ["手順", "How-to", "ガイド", "入門"], ["操作手順", "料理手順", "DIY"], ["アイボリー", "標準余白", "段階的"], { genre: "guide", theme: "modern", typography: { fontFamily: "sans", fontScale: "medium", lineHeight: "normal" }, palette: { textColor: "#1f2a35", accentColor: "#3f88c5" }, page: { background: "ivory", marginScale: "standard", pageWidth: "standard", readerMode: "scroll", paragraphSpacing: "wide" }, cover: { coverStyle: "solid", layout: "layout-05", titlePosition: "top-left", authorPosition: "bottom-right", imagePosition: "bottom-center", imageFit: "contain", overlayOpacity: 0.08 }, image: { layout: "framed" }, motion: { reveal: "subtle" } }),
  preset("EDU-03", "Seminar Notes", "education", "講義やセミナーのノートに合う柔らかな設計。", ["講義", "セミナー", "ノート", "学び"], ["講演録", "勉強会", "研修"], ["紙背景", "セリフ", "広い行間"], { genre: "guide", theme: "classic", typography: { fontFamily: "serif", fontScale: "medium", lineHeight: "relaxed" }, palette: { textColor: "#2f251d", accentColor: "#6bb9ad" }, page: { background: "paper", marginScale: "standard", pageWidth: "standard", readerMode: "book", paragraphSpacing: "wide" }, cover: { coverStyle: "overlay", layout: "layout-02", titlePosition: "center", authorPosition: "bottom-left", imagePosition: "center", imageFit: "contain", titleScale: 0.95, overlayOpacity: 0.08 }, image: { layout: "contained" }, motion: { reveal: "subtle" } }),
  preset("EDU-04", "Technical Guide", "education", "技術資料や研究解説を高密度に読める設計。", ["技術", "研究", "専門", "解説"], ["技術書", "論文解説", "仕様書"], ["グリーン背景", "サンセリフ", "タイトな行間"], { genre: "guide", theme: "research", typography: { fontFamily: "sans", fontScale: "small", lineHeight: "tight" }, palette: { textColor: "#1f362f", accentColor: "#2a7f69" }, page: { background: "green", marginScale: "standard", pageWidth: "wide", readerMode: "scroll", paragraphSpacing: "compact" }, cover: { coverStyle: "band", layout: "layout-06", titlePosition: "center-left", authorPosition: "bottom-right", imagePosition: "top-right", imageFit: "contain", titleScale: 0.9, overlayOpacity: 0 }, image: { layout: "contained" }, motion: { reveal: "none" } }),

  preset("CAT-01", "Product Catalog", "catalog", "商品を一覧しやすいEC向けのカタログ設計。", ["商品", "カタログ", "EC", "一覧"], ["商品紹介", "販売資料", "ラインナップ"], ["白背景", "全面画像", "ワイド幅"], { genre: "catalog", theme: "modern", typography: { fontFamily: "sans", fontScale: "medium", lineHeight: "normal" }, palette: { textColor: "#1f2a35", accentColor: "#3f88c5" }, page: { background: "white", marginScale: "compact", pageWidth: "wide", readerMode: "magazine", paragraphSpacing: "normal" }, cover: { coverStyle: "solid", layout: "layout-04", titlePosition: "top-left", authorPosition: "bottom-right", imagePosition: "top-center", imageFit: "cover", overlayOpacity: 0.08 }, image: { layout: "full" }, motion: { reveal: "subtle" } }),
  preset("CAT-02", "Luxury Catalog", "catalog", "ブランド品を引き立てる濃色の高級カタログ。", ["高級商品", "ブランド", "ラグジュアリー", "カタログ"], ["ファッション", "ジュエリー", "高級品"], ["夜背景", "セリフ", "全面画像"], { genre: "catalog", theme: "portfolio", typography: { fontFamily: "serif", fontScale: "large", lineHeight: "relaxed" }, palette: { textColor: "#f2efe8", accentColor: "#84d5c8" }, page: { background: "night", marginScale: "wide", pageWidth: "wide", readerMode: "magazine", paragraphSpacing: "wide" }, cover: { coverStyle: "solid", layout: "layout-10", titlePosition: "center", authorPosition: "bottom-right", imagePosition: "center", imageFit: "cover", titleScale: 0.95, imageScale: 1, overlayOpacity: 0.18 }, image: { layout: "full" }, motion: { reveal: "subtle" } }),
  preset("CAT-03", "Service Brochure", "catalog", "サービス案内や会社資料に適した端正な設計。", ["サービス", "会社案内", "パンフレット", "提案"], ["営業資料", "会社紹介", "サービス説明"], ["アイボリー", "ゴシック", "標準幅"], { genre: "catalog", theme: "modern", typography: { fontFamily: "gothic", fontScale: "medium", lineHeight: "normal" }, palette: { textColor: "#1f2a35", accentColor: "#3f88c5" }, page: { background: "ivory", marginScale: "standard", pageWidth: "standard", readerMode: "book", paragraphSpacing: "normal" }, cover: { coverStyle: "band", layout: "layout-08", titlePosition: "center-left", authorPosition: "bottom-left", imagePosition: "center-right", imageFit: "contain", titleScale: 0.9, overlayOpacity: 0 }, image: { layout: "contained" }, motion: { reveal: "subtle" } }),
  preset("CAT-04", "Food / Recipe", "catalog", "料理やレシピの写真と文章を楽しむ設計。", ["料理", "レシピ", "飲食", "食"], ["レシピ本", "メニュー", "料理紹介"], ["珈琲色", "明朝", "写真を大きく"], { genre: "catalog", theme: "magazine", typography: { fontFamily: "mincho", fontScale: "medium", lineHeight: "relaxed" }, palette: { textColor: "#3a281e", accentColor: "#d58a2a" }, page: { background: "cafe", marginScale: "standard", pageWidth: "standard", readerMode: "magazine", paragraphSpacing: "wide" }, cover: { coverStyle: "overlay", layout: "layout-05", titlePosition: "top-left", authorPosition: "bottom-right", imagePosition: "bottom-center", imageFit: "cover", overlayOpacity: 0.14 }, image: { layout: "full" }, motion: { reveal: "subtle" } }),
];

export const BOOK_DESIGN_PRESET_IDS = BOOK_DESIGN_PRESETS.map((preset) => preset.id);
const PRESET_BY_ID = new Map(BOOK_DESIGN_PRESETS.map((preset) => [preset.id, preset]));

export function getBookDesignPreset(id: unknown) {
  return typeof id === "string" ? PRESET_BY_ID.get(id) : undefined;
}

export function getBookDesignPresetCatalog() {
  return BOOK_DESIGN_PRESETS.map(({ id, name, category, description, keywords, bestFor, visualTraits }) => ({ id, name, category, description, keywords, bestFor, visualTraits }));
}

const OVERRIDE_KEYS = new Set(["genre", "mood", "theme", "typography", "palette", "page", "cover", "image", "motion"]);
const NESTED_OVERRIDE_KEYS: Record<string, Set<string>> = {
  mood: new Set(["keywords", "density"]),
  typography: new Set(["fontFamily", "fontScale", "lineHeight"]),
  palette: new Set(["textColor", "accentColor"]),
  page: new Set(["background", "marginScale", "pageWidth", "bindingDirection", "readerMode", "paragraphSpacing"]),
  cover: new Set(["coverStyle", "layout", "titlePosition", "authorPosition", "imagePosition", "imageFit", "titleVisible", "authorVisible", "titleScale", "authorScale", "imageScale", "overlayOpacity", "titleTextOverride"]),
  image: new Set(["layout"]),
  motion: new Set(["reveal", "reducedMotion"]),
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Keep AI output as a narrow patch. Unknown keys are rejected before the
 * patch can replace any part of a code-defined preset.
 */
export function sanitizeBookDesignOverrides(value: unknown): BookDesignSpecOverrides | null {
  if (!isRecord(value)) return {};
  const sanitized: Record<string, unknown> = {};
  for (const [key, candidate] of Object.entries(value)) {
    if (!OVERRIDE_KEYS.has(key)) return null;
    if (["mood", "typography", "palette", "page", "cover", "image", "motion"].includes(key)) {
      if (!isRecord(candidate)) return null;
      const allowed = NESTED_OVERRIDE_KEYS[key];
      const nested: Record<string, unknown> = {};
      for (const [nestedKey, nestedValue] of Object.entries(candidate)) {
        if (!allowed.has(nestedKey)) return null;
        nested[nestedKey] = nestedValue;
      }
      sanitized[key] = nested;
    } else {
      sanitized[key] = candidate;
    }
  }
  return sanitized as BookDesignSpecOverrides;
}

export function mergeBookDesignPreset(
  preset: BookDesignPreset,
  rawOverrides: unknown,
): DesignSpecParseResult {
  const overrides = sanitizeBookDesignOverrides(rawOverrides);
  if (!overrides) return { success: false, error: "design overrides contain an unknown key" };
  const merged = {
    ...preset.spec,
    ...overrides,
    mood: { ...preset.spec.mood, ...overrides.mood },
    typography: { ...preset.spec.typography, ...overrides.typography },
    palette: { ...preset.spec.palette, ...overrides.palette },
    page: { ...preset.spec.page, ...overrides.page },
    cover: { ...preset.spec.cover, ...overrides.cover },
    image: { ...preset.spec.image, ...overrides.image },
    motion: { ...preset.spec.motion, ...overrides.motion },
  };
  return parseBookDesignSpec(merged);
}
