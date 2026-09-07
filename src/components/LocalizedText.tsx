"use client";

import { uiT, type UiTranslationKey } from "@/lib/localization";
import { useUiLocale } from "@/components/UiLocaleProvider";

export default function LocalizedText({ k }: { k: UiTranslationKey }) {
  const { locale } = useUiLocale();
  return uiT(locale, k);
}
