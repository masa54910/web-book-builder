import {
  UI_LOCALES,
  UI_TRANSLATION_KEYS,
  getUiResource,
  normalizeUiLocale,
  uiT,
} from "../src/lib/localization";

if (UI_LOCALES.join(",") !== "ja,en") throw new Error("Gate 23 expects ja and en UI locales");
if (normalizeUiLocale(undefined) !== "ja") throw new Error("Missing locale must fall back to ja");
if (normalizeUiLocale("xx") !== "ja") throw new Error("Invalid locale must fall back to ja");
if (normalizeUiLocale("en-US") !== "ja") throw new Error("Only an explicit supported locale is accepted");

const ja = getUiResource("ja");
const en = getUiResource("en");
for (const key of UI_TRANSLATION_KEYS) {
  if (!ja[key] || !en[key]) throw new Error(`Missing translation: ${key}`);
  if (ja[key].includes("undefined") || en[key].includes("undefined")) throw new Error(`Unsafe translation: ${key}`);
  if (uiT("en", key) !== en[key]) throw new Error(`English lookup failed: ${key}`);
}

if (uiT("en", "navigation.login") === uiT("ja", "navigation.login")) {
  throw new Error("Representative ja/en translations must differ");
}
if (uiT("en", "navigation.login" as never) === "navigation.login") {
  throw new Error("Raw translation keys must not be rendered");
}

console.log(`i18n verification passed: ${UI_TRANSLATION_KEYS.length} keys, ja/en parity, safe fallback`);
