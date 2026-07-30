export const SUPPORTED_LOCALES = ["ja", "en", "ko", "zh-CN", "zh-TW", "fr", "id", "vi"] as const;

export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

export const localeLabels: Record<SupportedLocale, string> = {
  ja: "日本語",
  en: "English",
  ko: "한국어",
  "zh-CN": "简体中文",
  "zh-TW": "繁體中文",
  fr: "Français",
  id: "Bahasa Indonesia",
  vi: "Tiếng Việt",
};

type TranslationKey =
  | "nav.home"
  | "nav.dashboard"
  | "nav.newBook"
  | "nav.settings"
  | "nav.help"
  | "nav.blog"
  | "cta.start"
  | "cta.publish"
  | "cta.save"
  | "cta.promotion"
  | "reader.autoflip.start"
  | "reader.autoflip.stop"
  | "promotion.title"
  | "promotion.x"
  | "promotion.note"
  | "promotion.video";

const dictionary: Record<SupportedLocale, Record<TranslationKey, string>> = {
  ja: {
    "nav.home": "ホーム",
    "nav.dashboard": "作品一覧",
    "nav.newBook": "新しい作品",
    "nav.settings": "設定",
    "nav.help": "ヘルプ",
    "nav.blog": "編集部ブログ",
    "cta.start": "Webブックを作る",
    "cta.publish": "公開する",
    "cta.save": "保存",
    "cta.promotion": "広める",
    "reader.autoflip.start": "自動めくり開始",
    "reader.autoflip.stop": "停止",
    "promotion.title": "Promotion Center",
    "promotion.x": "Xに投稿する",
    "promotion.note": "note記事を作る",
    "promotion.video": "動画を作成",
  },
  en: {
    "nav.home": "Home",
    "nav.dashboard": "Library",
    "nav.newBook": "New book",
    "nav.settings": "Settings",
    "nav.help": "Help",
    "nav.blog": "Editorial blog",
    "cta.start": "Create a web book",
    "cta.publish": "Publish",
    "cta.save": "Save",
    "cta.promotion": "Promote",
    "reader.autoflip.start": "Start auto flip",
    "reader.autoflip.stop": "Stop",
    "promotion.title": "Promotion Center",
    "promotion.x": "Post to X",
    "promotion.note": "Create note article",
    "promotion.video": "Create video",
  },
  ko: {} as Record<TranslationKey, string>,
  "zh-CN": {} as Record<TranslationKey, string>,
  "zh-TW": {} as Record<TranslationKey, string>,
  fr: {} as Record<TranslationKey, string>,
  id: {} as Record<TranslationKey, string>,
  vi: {} as Record<TranslationKey, string>,
};

dictionary.ko = { ...dictionary.en, "cta.start": "웹북 만들기", "cta.publish": "게시", "promotion.title": "프로모션 센터" };
dictionary["zh-CN"] = { ...dictionary.en, "cta.start": "创建Web书籍", "cta.publish": "发布", "promotion.title": "推广中心" };
dictionary["zh-TW"] = { ...dictionary.en, "cta.start": "建立Web書籍", "cta.publish": "發布", "promotion.title": "推廣中心" };
dictionary.fr = { ...dictionary.en, "cta.start": "Créer un livre Web", "cta.publish": "Publier", "promotion.title": "Centre de promotion" };
dictionary.id = { ...dictionary.en, "cta.start": "Buat buku web", "cta.publish": "Terbitkan", "promotion.title": "Pusat Promosi" };
dictionary.vi = { ...dictionary.en, "cta.start": "Tạo sách web", "cta.publish": "Xuất bản", "promotion.title": "Trung tâm quảng bá" };

export function normalizeLocale(value: string | undefined): SupportedLocale {
  return SUPPORTED_LOCALES.includes(value as SupportedLocale) ? (value as SupportedLocale) : "ja";
}

export function t(locale: SupportedLocale | undefined, key: TranslationKey) {
  const normalized = normalizeLocale(locale);
  return dictionary[normalized][key] || dictionary.ja[key] || key;
}
