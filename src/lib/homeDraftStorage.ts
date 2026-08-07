export const HOME_DRAFT_STORAGE_KEY = "webbookmaker:home-draft";
export const HOME_DRAFT_VERSION = 1 as const;

export type HomeDraftTarget = "hero" | "cta";

export type HomeDraft = {
  version: typeof HOME_DRAFT_VERSION;
  text: string;
  savedAt: number;
  target?: HomeDraftTarget;
};

function getStorage(): Storage | null {
  if (typeof window === "undefined") return null;

  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function deleteHomeDraft() {
  const storage = getStorage();
  if (!storage) return;

  try {
    storage.removeItem(HOME_DRAFT_STORAGE_KEY);
  } catch {
    // localStorage may be unavailable or quota-restricted. Home input must remain usable.
  }
}

export function saveHomeDraft(text: string, target?: HomeDraftTarget): HomeDraft | null {
  const normalizedText = text.trim();
  if (!normalizedText) {
    deleteHomeDraft();
    return null;
  }

  const draft: HomeDraft = {
    version: HOME_DRAFT_VERSION,
    text,
    savedAt: Date.now(),
    ...(target ? { target } : {}),
  };
  const storage = getStorage();
  if (!storage) return null;

  try {
    storage.setItem(HOME_DRAFT_STORAGE_KEY, JSON.stringify(draft));
    return draft;
  } catch {
    // QuotaExceededError and privacy-mode storage failures must not crash the LP.
    return null;
  }
}

export function loadHomeDraft(): HomeDraft | null {
  const storage = getStorage();
  if (!storage) return null;

  let raw: string | null = null;
  try {
    raw = storage.getItem(HOME_DRAFT_STORAGE_KEY);
  } catch {
    return null;
  }
  if (!raw) return null;

  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") throw new Error("Invalid home draft");

    const candidate = parsed as Partial<HomeDraft>;
    if (
      candidate.version !== HOME_DRAFT_VERSION ||
      typeof candidate.text !== "string" ||
      !candidate.text.trim() ||
      typeof candidate.savedAt !== "number" ||
      !Number.isFinite(candidate.savedAt) ||
      (candidate.target !== undefined && candidate.target !== "hero" && candidate.target !== "cta")
    ) {
      throw new Error("Invalid home draft");
    }

    return {
      version: HOME_DRAFT_VERSION,
      text: candidate.text,
      savedAt: candidate.savedAt,
      ...(candidate.target ? { target: candidate.target } : {}),
    };
  } catch {
    deleteHomeDraft();
    return null;
  }
}
