import type { ThemeId } from "@/lib/productTypes";

export type BookThemeSettings = {
  background: "paper" | "ivory" | "cafe" | "night" | "green";
  fontFamily: "mincho" | "gothic" | "serif" | "sans";
  fontScale: "small" | "medium" | "large";
  lineHeight: "tight" | "normal" | "relaxed";
  marginScale: "compact" | "standard" | "wide";
  pageWidth: "narrow" | "standard" | "wide";
  textColor: string;
  accentColor: string;
  coverStyle: "overlay" | "solid" | "band";
  imageLayout: "framed" | "full" | "contained";
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
    settings: {
      background: "paper",
      fontFamily: "mincho",
      fontScale: "medium",
      lineHeight: "normal",
      marginScale: "standard",
      pageWidth: "standard",
      textColor: "#2f251d",
      accentColor: "#6bb9ad",
      coverStyle: "overlay",
      imageLayout: "framed",
    },
  },
  {
    id: "modern",
    name: "Modern",
    description: "すっきりしたWeb雑誌向け。",
    plan: "free",
    settings: {
      background: "ivory",
      fontFamily: "sans",
      fontScale: "medium",
      lineHeight: "normal",
      marginScale: "standard",
      pageWidth: "wide",
      textColor: "#1f2a35",
      accentColor: "#3f88c5",
      coverStyle: "solid",
      imageLayout: "contained",
    },
  },
  {
    id: "minimal",
    name: "Minimal",
    description: "余白を活かす静かなテーマ。",
    plan: "free",
    settings: {
      background: "paper",
      fontFamily: "serif",
      fontScale: "medium",
      lineHeight: "relaxed",
      marginScale: "wide",
      pageWidth: "narrow",
      textColor: "#2a2926",
      accentColor: "#9e7b50",
      coverStyle: "band",
      imageLayout: "framed",
    },
  },
  {
    id: "magazine",
    name: "Magazine",
    description: "写真と見出しを活かす文芸誌風。",
    plan: "plus",
    settings: {
      background: "cafe",
      fontFamily: "mincho",
      fontScale: "medium",
      lineHeight: "normal",
      marginScale: "standard",
      pageWidth: "wide",
      textColor: "#3a281e",
      accentColor: "#d58a2a",
      coverStyle: "overlay",
      imageLayout: "full",
    },
  },
  {
    id: "novel",
    name: "Novel",
    description: "長文小説に向いた読み心地。",
    plan: "plus",
    settings: {
      background: "ivory",
      fontFamily: "mincho",
      fontScale: "large",
      lineHeight: "relaxed",
      marginScale: "wide",
      pageWidth: "standard",
      textColor: "#33261d",
      accentColor: "#8f6a42",
      coverStyle: "overlay",
      imageLayout: "framed",
    },
  },
  {
    id: "photo",
    name: "Photo",
    description: "写真集・旅行記向け。",
    plan: "plus",
    settings: {
      background: "night",
      fontFamily: "sans",
      fontScale: "medium",
      lineHeight: "normal",
      marginScale: "compact",
      pageWidth: "wide",
      textColor: "#f2efe8",
      accentColor: "#6bb9ad",
      coverStyle: "solid",
      imageLayout: "full",
    },
  },
  {
    id: "research",
    name: "Research",
    description: "研究資料・教材向け。",
    plan: "plus",
    settings: {
      background: "paper",
      fontFamily: "gothic",
      fontScale: "small",
      lineHeight: "tight",
      marginScale: "standard",
      pageWidth: "wide",
      textColor: "#23303b",
      accentColor: "#4a708b",
      coverStyle: "band",
      imageLayout: "contained",
    },
  },
  {
    id: "portfolio",
    name: "Portfolio",
    description: "作品集・プロフィール向け。",
    plan: "plus",
    settings: {
      background: "green",
      fontFamily: "serif",
      fontScale: "medium",
      lineHeight: "normal",
      marginScale: "wide",
      pageWidth: "wide",
      textColor: "#1f362f",
      accentColor: "#2a7f69",
      coverStyle: "solid",
      imageLayout: "contained",
    },
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
    `book-leading-${merged.lineHeight}`,
    `book-margin-${merged.marginScale}`,
    `book-width-${merged.pageWidth}`,
    `book-image-layout-${merged.imageLayout}`,
    `book-cover-style-${merged.coverStyle}`,
  ].join(" ");
}

export const colorPresets = [
  { name: "墨", text: "#2f251d", accent: "#6bb9ad" },
  { name: "深海", text: "#1f2a35", accent: "#3f88c5" },
  { name: "珈琲", text: "#3a281e", accent: "#d58a2a" },
  { name: "森", text: "#1f362f", accent: "#2a7f69" },
  { name: "夜空", text: "#f2efe8", accent: "#84d5c8" },
] as const;

function toRgb(hex: string) {
  const cleaned = hex.trim().replace("#", "");
  const full = cleaned.length === 3 ? cleaned.split("").map((c) => `${c}${c}`).join("") : cleaned;
  if (!/^[0-9a-fA-F]{6}$/.test(full)) return null;
  const int = Number.parseInt(full, 16);
  return {
    r: (int >> 16) & 255,
    g: (int >> 8) & 255,
    b: int & 255,
  };
}

function luminance(hex: string) {
  const rgb = toRgb(hex);
  if (!rgb) return null;
  const channel = (v: number) => {
    const normalized = v / 255;
    return normalized <= 0.03928 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(rgb.r) + 0.7152 * channel(rgb.g) + 0.0722 * channel(rgb.b);
}

export function contrastRatio(colorA: string, colorB: string) {
  const a = luminance(colorA);
  const b = luminance(colorB);
  if (a === null || b === null) return 1;
  const light = Math.max(a, b);
  const dark = Math.min(a, b);
  return (light + 0.05) / (dark + 0.05);
}
