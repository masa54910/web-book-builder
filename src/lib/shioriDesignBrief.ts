export type ShioriCategory =
  | "education" | "business" | "novel" | "essay" | "magazine"
  | "photo_book" | "picture_book" | "research" | "portfolio" | "other";

export type ShioriAnswers = {
  category?: ShioriCategory;
  audience?: string;
  tone?: string;
  contentBalance?: string;
  density?: string;
  cover?: string;
  brightness?: string;
  decoration?: string;
  emphasis?: string;
  avoid?: string;
  genreDetails: Record<string, string>;
};

export type ShioriDesignBrief = {
  version: 1;
  category: ShioriCategory;
  audience: string;
  tone: string;
  contentBalance: string;
  density: string;
  cover: string;
  brightness: string;
  decoration: string;
  emphasis: string;
  avoid: string;
  genreDetails: Record<string, string>;
  writingMode: "horizontal-tb";
  bindingDirection: "ltr";
};

export const SHIORI_CATEGORY_LABELS: Record<ShioriCategory, string> = {
  education: "教材・教本", business: "ビジネス・実用書", novel: "小説・文庫",
  essay: "エッセイ", magazine: "雑誌・特集", photo_book: "写真集・旅行記",
  picture_book: "絵本", research: "研究・レポート", portfolio: "作品集・ポートフォリオ", other: "その他",
};

export function createInitialShioriAnswers(): ShioriAnswers {
  return { genreDetails: {} };
}

export function buildShioriDesignBrief(answers: ShioriAnswers): ShioriDesignBrief | null {
  if (!answers.category || !answers.audience || !answers.tone || !answers.contentBalance || !answers.density || !answers.cover || !answers.brightness || !answers.decoration || !answers.emphasis || !answers.avoid) return null;
  return {
    version: 1, category: answers.category, audience: answers.audience, tone: answers.tone,
    contentBalance: answers.contentBalance, density: answers.density, cover: answers.cover,
    brightness: answers.brightness, decoration: answers.decoration, emphasis: answers.emphasis,
    avoid: answers.avoid, genreDetails: { ...answers.genreDetails }, writingMode: "horizontal-tb", bindingDirection: "ltr",
  };
}

export function summarizeShioriBrief(brief: ShioriDesignBrief) {
  return `${SHIORI_CATEGORY_LABELS[brief.category]}として、${brief.audience}に向けた${brief.tone}雰囲気。${brief.contentBalance}を大切にし、${brief.density}の読みやすさで、${brief.cover}表紙に整えます。`;
}
