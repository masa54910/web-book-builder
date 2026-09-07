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

export type TranslationKey =
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
  | "promotion.note";

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

/**
 * UI locale is intentionally separate from SupportedLocale. SupportedLocale is
 * also used by book content and must not be changed when a reader switches the
 * application chrome language.
 */
export const UI_LOCALES = ["ja", "en"] as const;
export type UiLocale = (typeof UI_LOCALES)[number];

export const uiLocaleLabels: Record<UiLocale, string> = {
  ja: "日本語",
  en: "English",
};

export type UiTranslationKey =
  | "common.language"
  | "common.loading"
  | "common.error"
  | "common.backHome"
  | "navigation.howItWorks"
  | "navigation.pricing"
  | "navigation.promotion"
  | "navigation.faq"
  | "navigation.login"
  | "navigation.start"
  | "navigation.library"
  | "navigation.analytics"
  | "navigation.settings"
  | "navigation.logout"
  | "pricing.title"
  | "pricing.lead"
  | "pricing.compare"
  | "pricing.freePlan"
  | "pricing.publicationPlan"
  | "pricing.operationPlan"
  | "pricing.startFree"
  | "pricing.startPublication"
  | "pricing.startOperation"
  | "contact.title"
  | "contact.description"
  | "contact.name"
  | "contact.replyEmail"
  | "contact.category"
  | "contact.message"
  | "contact.send"
  | "contact.sending"
  | "contact.success"
  | "contact.error"
  | "auth.login"
  | "auth.signup"
  | "auth.forgotPassword"
  | "auth.email"
  | "auth.password"
  | "auth.passwordConfirm"
  | "auth.displayName"
  | "auth.submit"
  | "dashboard.createBook"
  | "dashboard.empty"
  | "editor.save"
  | "editor.preview"
  | "editor.publish"
  | "editor.undo"
  | "editor.redo"
  | "editor.addMap"
  | "map.title"
  | "map.expand"
  | "map.close"
  | "map.openInGoogleMaps"
  | "map.fallback"
  | "map.invalidUrl"
  | "map.size"
  | "map.sizeSmall"
  | "map.sizeMedium"
  | "map.sizeLarge"
  | "reader.tableOfContents"
  | "reader.share"
  | "reader.zoom"
  | "reader.paid"
  | "legal.japaneseAuthoritative";

type UiResource = Record<UiTranslationKey, string>;

const uiResources: Record<UiLocale, UiResource> = {
  ja: {
    "common.language": "表示言語",
    "common.loading": "読み込み中…",
    "common.error": "エラーが発生しました。",
    "common.backHome": "ホームへ戻る",
    "navigation.howItWorks": "作り方",
    "navigation.pricing": "料金プラン",
    "navigation.promotion": "作品を広める",
    "navigation.faq": "よくある質問",
    "navigation.login": "ログイン",
    "navigation.start": "はじめる",
    "navigation.library": "作品一覧",
    "navigation.analytics": "分析",
    "navigation.settings": "設定",
    "navigation.logout": "ログアウト",
    "pricing.title": "料金プラン",
    "pricing.lead": "作るところまでは無料。公開スタイルに合わせて選べます。",
    "pricing.compare": "プラン比較表",
    "pricing.freePlan": "無料プラン",
    "pricing.publicationPlan": "出版プラン",
    "pricing.operationPlan": "運用プラン",
    "pricing.startFree": "無料ではじめる",
    "pricing.startPublication": "出版プランではじめる",
    "pricing.startOperation": "運用プランではじめる",
    "contact.title": "お問い合わせ",
    "contact.description": "ご質問や不具合のご連絡を、こちらのフォームからお送りください。",
    "contact.name": "お名前",
    "contact.replyEmail": "返信先メールアドレス",
    "contact.category": "お問い合わせ種別",
    "contact.message": "お問い合わせ内容",
    "contact.send": "お問い合わせを送信",
    "contact.sending": "送信しています…",
    "contact.success": "お問い合わせを受け付けました。",
    "contact.error": "お問い合わせを送信できませんでした。",
    "auth.login": "ログイン",
    "auth.signup": "無料で始める",
    "auth.forgotPassword": "パスワード再設定",
    "auth.email": "メールアドレス",
    "auth.password": "パスワード",
    "auth.passwordConfirm": "パスワード（確認）",
    "auth.displayName": "表示名",
    "auth.submit": "送信",
    "dashboard.createBook": "新しい作品を作る",
    "dashboard.empty": "作品はまだありません。",
    "editor.save": "保存",
    "editor.preview": "プレビュー",
    "editor.publish": "公開する",
    "editor.undo": "元に戻す",
    "editor.redo": "やり直す",
    "editor.addMap": "Googleマップを埋め込む",
    "map.title": "Googleマップ",
    "map.expand": "地図を拡大",
    "map.close": "地図を閉じる",
    "map.openInGoogleMaps": "Googleマップで開く",
    "map.fallback": "地図の埋め込みに失敗しました。Googleマップで開いてください。",
    "map.invalidUrl": "Googleマップの共有URLまたは埋め込みURLを入力してください。",
    "map.size": "地図サイズ",
    "map.sizeSmall": "小",
    "map.sizeMedium": "中",
    "map.sizeLarge": "大",
    "reader.tableOfContents": "目次",
    "reader.share": "共有",
    "reader.zoom": "拡大・縮小",
    "reader.paid": "ここからは有料",
    "legal.japaneseAuthoritative": "法的な本文は日本語版が正式です。",
  },
  en: {
    "common.language": "Language",
    "common.loading": "Loading…",
    "common.error": "Something went wrong.",
    "common.backHome": "Back to home",
    "navigation.howItWorks": "How it works",
    "navigation.pricing": "Pricing",
    "navigation.promotion": "Share your work",
    "navigation.faq": "FAQ",
    "navigation.login": "Log in",
    "navigation.start": "Get started",
    "navigation.library": "Library",
    "navigation.analytics": "Analytics",
    "navigation.settings": "Settings",
    "navigation.logout": "Log out",
    "pricing.title": "Pricing",
    "pricing.lead": "Create for free, then choose the publishing style that fits your work.",
    "pricing.compare": "Compare plans",
    "pricing.freePlan": "Free plan",
    "pricing.publicationPlan": "Publication plan",
    "pricing.operationPlan": "Operation plan",
    "pricing.startFree": "Start for free",
    "pricing.startPublication": "Start Publication plan",
    "pricing.startOperation": "Start Operation plan",
    "contact.title": "Contact",
    "contact.description": "Send us your questions or report a problem using this form.",
    "contact.name": "Name",
    "contact.replyEmail": "Reply-to email",
    "contact.category": "Category",
    "contact.message": "Message",
    "contact.send": "Send inquiry",
    "contact.sending": "Sending…",
    "contact.success": "Your inquiry has been received.",
    "contact.error": "We could not send your inquiry.",
    "auth.login": "Log in",
    "auth.signup": "Get started free",
    "auth.forgotPassword": "Reset password",
    "auth.email": "Email address",
    "auth.password": "Password",
    "auth.passwordConfirm": "Confirm password",
    "auth.displayName": "Display name",
    "auth.submit": "Submit",
    "dashboard.createBook": "Create a new book",
    "dashboard.empty": "You do not have any books yet.",
    "editor.save": "Save",
    "editor.preview": "Preview",
    "editor.publish": "Publish",
    "editor.undo": "Undo",
    "editor.redo": "Redo",
    "editor.addMap": "Embed Google Maps",
    "map.title": "Google Maps",
    "map.expand": "Expand map",
    "map.close": "Close map",
    "map.openInGoogleMaps": "Open in Google Maps",
    "map.fallback": "Map embedding failed. Open it in Google Maps.",
    "map.invalidUrl": "Enter an official Google Maps share or embed URL.",
    "map.size": "Map size",
    "map.sizeSmall": "Small",
    "map.sizeMedium": "Medium",
    "map.sizeLarge": "Large",
    "reader.tableOfContents": "Table of contents",
    "reader.share": "Share",
    "reader.zoom": "Zoom",
    "reader.paid": "Paid content from here",
    "legal.japaneseAuthoritative": "The Japanese text is the authoritative legal version.",
  },
};

export const UI_TRANSLATION_KEYS = Object.keys(uiResources.ja) as UiTranslationKey[];

export function normalizeUiLocale(value: unknown): UiLocale {
  return value === "en" ? "en" : "ja";
}

export function uiT(locale: UiLocale | string | undefined, key: UiTranslationKey): string {
  const normalized = normalizeUiLocale(locale);
  return uiResources[normalized][key] ?? uiResources.ja[key] ?? "";
}

export function getUiResource(locale: UiLocale): Readonly<UiResource> {
  return uiResources[normalizeUiLocale(locale)];
}

export function getUiResourceKeys(): readonly UiTranslationKey[] {
  return UI_TRANSLATION_KEYS;
}
