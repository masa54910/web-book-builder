"use client";

import { UI_LOCALES, uiLocaleLabels } from "@/lib/localization";
import { useUiLocale } from "@/components/UiLocaleProvider";

export default function LanguageSelector() {
  const { locale, setLocale } = useUiLocale();

  return (
    <label className="wbm-language-selector">
      <span className="sr-only">表示言語 / Language</span>
      <select
        aria-label="表示言語 / Language"
        value={locale}
        onChange={(event) => setLocale(event.target.value as (typeof UI_LOCALES)[number])}
      >
        {UI_LOCALES.map((option) => (
          <option key={option} value={option}>{uiLocaleLabels[option]}</option>
        ))}
      </select>
    </label>
  );
}
