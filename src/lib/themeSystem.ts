import type { ThemeId } from "@/lib/productTypes";

export type BookThemeSettings = {
  background: "paper" | "ivory" | "cafe" | "night" | "green";
  fontFamily: "mincho" | "gothic" | "serif" | "sans";
  fontScale: "small" | "medium" | "large";
  marginScale: "compact" | "standard" | "wide";
  pageWidth: "narrow" | "standard" | "wide";
};

export type ThemePreset = {
  id: ThemeId;
  name: string;
  description: string;
  settings: BookThemeSettings;
  plan: "free" | "plus";
};

export const themePresets: ThemePreset[] = [
  {
    id: "classic",
    name: "Classic",
    description: "紙の本に近い、温かい標準テーマ。",
    plan: "free",
    settings: { background: "paper", fontFamily: "mincho", fontScale: "medium", marginScale: "standard", pageWidth: "standard" },
  },
  {
    id: "modern",
    name: "Modern",
    description: "すっきりしたWeb雑誌向け。",
    plan: "free",
    settings: { background: "ivory", fontFamily: "sans", fontScale: "medium", marginScale: "standard", pageWidth: "wide" },
  },
  {
    id: "minimal",
    name: "Minimal",
    description: "余白を活かす静かなテーマ。",
    plan: "free",
    settings: { background: "paper", fontFamily: "serif", fontScale: "medium", marginScale: "wide", pageWidth: "narrow" },
  },
  {
    id: "magazine",
    name: "Magazine",
    description: "写真と見出しを活かす文芸誌風。",
    plan: "plus",
    settings: { background: "cafe", fontFamily: "mincho", fontScale: "medium", marginScale: "standard", pageWidth: "wide" },
  },
  {
    id: "novel",
    name: "Novel",
    description: "長文小説に向いた読み心地。",
    plan: "plus",
    settings: { background: "ivory", fontFamily: "mincho", fontScale: "large", marginScale: "wide", pageWidth: "standard" },
  },
  {
    id: "photo",
    name: "Photo",
    description: "写真集・旅行記向け。",
    plan: "plus",
    settings: { background: "night", fontFamily: "sans", fontScale: "medium", marginScale: "compact", pageWidth: "wide" },
  },
  {
    id: "research",
    name: "Research",
    description: "研究資料・教材向け。",
    plan: "plus",
    settings: { background: "paper", fontFamily: "gothic", fontScale: "small", marginScale: "standard", pageWidth: "wide" },
  },
  {
    id: "portfolio",
    name: "Portfolio",
    description: "作品集・プロフィール向け。",
    plan: "plus",
    settings: { background: "green", fontFamily: "serif", fontScale: "medium", marginScale: "wide", pageWidth: "wide" },
  },
];

export function getThemePreset(theme: ThemeId | undefined) {
  return themePresets.find((preset) => preset.id === theme) ?? themePresets[0];
}

export function mergeThemeSettings(theme: ThemeId, overrides?: Partial<BookThemeSettings>) {
  return { ...getThemePreset(theme).settings, ...overrides };
}

export function themeClassNames(theme: ThemeId, settings?: Partial<BookThemeSettings>) {
  const merged = mergeThemeSettings(theme, settings);
  return [
    `theme-${theme}`,
    `book-bg-${merged.background}`,
    `book-font-${merged.fontFamily}`,
    `book-size-${merged.fontScale}`,
    `book-margin-${merged.marginScale}`,
    `book-width-${merged.pageWidth}`,
  ].join(" ");
}
