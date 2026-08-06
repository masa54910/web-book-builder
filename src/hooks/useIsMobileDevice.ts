"use client";

import { useSyncExternalStore } from "react";

const MOBILE_QUERY = "(max-width: 767px)";

function getMediaQuery() {
  if (typeof window === "undefined") return null;
  return window.matchMedia(MOBILE_QUERY);
}

function subscribe(onStoreChange: () => void) {
  const media = getMediaQuery();
  if (!media) return () => undefined;

  if (media.addEventListener) {
    media.addEventListener("change", onStoreChange);
    return () => media.removeEventListener("change", onStoreChange);
  }

  media.addListener(onStoreChange);
  return () => media.removeListener(onStoreChange);
}

function getSnapshot() {
  return getMediaQuery()?.matches ?? false;
}

function getServerSnapshot() {
  return false;
}

/**
 * Reads the viewport as an external store so desktop/mobile share URLs stay
 * hydration-safe while still updating when the viewport changes.
 */
export function useIsMobileDevice() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
