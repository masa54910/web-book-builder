"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

import { normalizeUiLocale, type UiLocale } from "@/lib/localization";

export const UI_LOCALE_STORAGE_KEY = "wbm-ui-locale";
export const UI_LOCALE_COOKIE = "wbm-ui-locale";

type UiLocaleContextValue = {
  locale: UiLocale;
  setLocale: (locale: UiLocale) => void;
  isReady: boolean;
};

const UiLocaleContext = createContext<UiLocaleContextValue | null>(null);

function readSavedLocale(): UiLocale | null {
  try {
    const stored = window.localStorage.getItem(UI_LOCALE_STORAGE_KEY);
    if (stored === "ja" || stored === "en") return stored;
  } catch {
    // Storage can be unavailable in privacy-restricted browsers.
  }

  const cookie = document.cookie
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${UI_LOCALE_COOKIE}=`));
  const value = cookie?.slice(UI_LOCALE_COOKIE.length + 1);
  return value === "ja" || value === "en" ? value : null;
}

function detectBrowserLocale(): UiLocale {
  const languages = navigator.languages?.length ? navigator.languages : [navigator.language];
  return languages.some((language) => language?.toLowerCase().startsWith("en")) ? "en" : "ja";
}

function persistLocale(locale: UiLocale) {
  try {
    window.localStorage.setItem(UI_LOCALE_STORAGE_KEY, locale);
  } catch {
    // Cookie persistence below still provides a best-effort fallback.
  }
  document.cookie = `${UI_LOCALE_COOKIE}=${locale}; Path=/; Max-Age=31536000; SameSite=Lax`;
}

export function UiLocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<UiLocale>("ja");
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const saved = readSavedLocale();
    const initial = saved ?? detectBrowserLocale();
    const timer = window.setTimeout(() => {
      setLocaleState(initial);
      setIsReady(true);
      document.documentElement.lang = initial;
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!isReady) return;
    document.documentElement.lang = locale;
  }, [isReady, locale]);

  const value = useMemo<UiLocaleContextValue>(() => ({
    locale,
    isReady,
    setLocale: (nextLocale) => {
      const next = normalizeUiLocale(nextLocale);
      setLocaleState(next);
      persistLocale(next);
      document.documentElement.lang = next;
    },
  }), [isReady, locale]);

  return <UiLocaleContext.Provider value={value}>{children}</UiLocaleContext.Provider>;
}

export function useUiLocale(): UiLocaleContextValue {
  const context = useContext(UiLocaleContext);
  if (!context) throw new Error("useUiLocale must be used within UiLocaleProvider");
  return context;
}
