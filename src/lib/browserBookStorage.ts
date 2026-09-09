"use client";

export const DRAFT_STORAGE_KEY = "webBookMaker:draft:current";
export const PREVIEW_POINTER_KEY = "webBookMaker:preview:current";
export const PREVIEW_RETURN_KEY = "webBookMaker:preview:return";
export const AUTOSAVE_STORAGE_PREFIX = "webbookmaker:autosave:";
export const NEW_DRAFT_SESSION_PREFIX = "webbookmaker:new-draft-session:";
export const AUTOSAVE_MAX_AGE_MS = 1000 * 60 * 60 * 24 * 30;

export type MakerDraft = {
  version: 1;
  fields: Record<string, unknown>;
  savedAt: string;
};

export type PreviewReturnState = {
  draftId: string;
  returnTo: string;
  scrollY: number;
  savedAt: string;
};

export type AutoSaveDraft = {
  version: 1;
  bookId: string | null;
  userId: string;
  fields: Record<string, unknown>;
  savedAt: string;
};

function autosaveStorageKey(bookId?: string | null) {
  return `${AUTOSAVE_STORAGE_PREFIX}${bookId?.trim() || "new"}`;
}

function getStorage() {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function getSessionStorage() {
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

function newDraftSessionStorageKey(userId: string) {
  return `${NEW_DRAFT_SESSION_PREFIX}${userId.trim()}`;
}

function createNewDraftId() {
  const cryptoApi = typeof crypto !== "undefined" ? crypto : undefined;
  const randomUuid = cryptoApi && typeof cryptoApi.randomUUID === "function"
    ? cryptoApi.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `new-${randomUuid}`;
}

/**
 * Return the temporary identity for the current user's in-progress new book.
 * sessionStorage intentionally scopes this identity to the current browser
 * tab/session, so a later `/books/new` gets a fresh namespace after a formal
 * save while a reload can still restore the same unfinished draft.
 */
export function getOrCreateNewDraftId(userId: string) {
  const normalizedUserId = userId.trim();
  if (!normalizedUserId) return null;
  const storage = getSessionStorage();
  if (!storage) return createNewDraftId();
  const key = newDraftSessionStorageKey(normalizedUserId);
  try {
    const existing = storage.getItem(key)?.trim();
    if (existing) return existing;
    const created = createNewDraftId();
    storage.setItem(key, created);
    return created;
  } catch {
    return createNewDraftId();
  }
}

export function clearNewDraftSession(userId: string) {
  const normalizedUserId = userId.trim();
  if (!normalizedUserId) return;
  try {
    getSessionStorage()?.removeItem(newDraftSessionStorageKey(normalizedUserId));
  } catch {
    // Ignore cleanup failures in restricted storage environments.
  }
}

export function saveDraft(fields: Record<string, unknown>) {
  const storage = getStorage();
  if (!storage) return null;
  const draft: MakerDraft = {
    version: 1,
    fields,
    savedAt: new Date().toISOString(),
  };
  try {
    storage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft));
    return draft;
  } catch {
    return null;
  }
}

export function loadDraft(): MakerDraft | null {
  const storage = getStorage();
  if (!storage) return null;
  try {
    const parsed: unknown = JSON.parse(storage.getItem(DRAFT_STORAGE_KEY) ?? "null");
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      (parsed as MakerDraft).version === 1 &&
      typeof (parsed as MakerDraft).savedAt === "string" &&
      typeof (parsed as MakerDraft).fields === "object"
    ) {
      return parsed as MakerDraft;
    }
  } catch {
    return null;
  }
  return null;
}

export function deleteDraft() {
  try {
    getStorage()?.removeItem(DRAFT_STORAGE_KEY);
  } catch {
    // Storage may be unavailable in privacy modes.
  }
}

/**
 * Save an editor-only snapshot. This deliberately never calls Supabase or
 * touches the canonical save/publish pipeline.
 */
export function saveAutosaveDraft(input: {
  bookId?: string | null;
  userId: string;
  fields: Record<string, unknown>;
}) {
  const storage = getStorage();
  if (!storage || !input.userId.trim()) return null;
  const draft: AutoSaveDraft = {
    version: 1,
    bookId: input.bookId?.trim() || null,
    userId: input.userId,
    fields: input.fields,
    savedAt: new Date().toISOString(),
  };
  try {
    storage.setItem(autosaveStorageKey(draft.bookId), JSON.stringify(draft));
    return draft;
  } catch {
    // Quota errors, privacy mode, and circular/non-serializable values must
    // never interrupt editing.
    return null;
  }
}

export function loadAutosaveDraft(bookId: string | null | undefined, userId: string) {
  const storage = getStorage();
  if (!storage || !userId.trim()) return null;
  const key = autosaveStorageKey(bookId);
  try {
    const raw = storage.getItem(key);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null || (parsed as AutoSaveDraft).version !== 1) {
      storage.removeItem(key);
      return null;
    }
    if ((parsed as AutoSaveDraft).userId !== userId) {
      // Keep another account's snapshot for that account, but never restore it
      // into the current session.
      return null;
    }
    if (
      (parsed as AutoSaveDraft).bookId !== (bookId?.trim() || null) ||
      typeof (parsed as AutoSaveDraft).savedAt !== "string" ||
      typeof (parsed as AutoSaveDraft).fields !== "object" ||
      (parsed as AutoSaveDraft).fields === null ||
      Array.isArray((parsed as AutoSaveDraft).fields)
    ) {
      storage.removeItem(key);
      return null;
    }
    const savedAt = Date.parse((parsed as AutoSaveDraft).savedAt);
    if (!Number.isFinite(savedAt) || Date.now() - savedAt > AUTOSAVE_MAX_AGE_MS) {
      storage.removeItem(key);
      return null;
    }
    return parsed as AutoSaveDraft;
  } catch {
    try {
      storage.removeItem(key);
    } catch {
      // Ignore cleanup failures in restricted storage environments.
    }
    return null;
  }
}

export function deleteAutosaveDraft(bookId?: string | null) {
  try {
    getStorage()?.removeItem(autosaveStorageKey(bookId));
  } catch {
    // Storage may be unavailable in privacy modes.
  }
}

export function savePreviewReturnState(state: Omit<PreviewReturnState, "savedAt">) {
  const storage = getStorage();
  if (!storage) return null;
  const payload: PreviewReturnState = {
    ...state,
    savedAt: new Date().toISOString(),
  };
  try {
    storage.setItem(PREVIEW_RETURN_KEY, JSON.stringify(payload));
    return payload;
  } catch {
    return null;
  }
}

export function loadPreviewReturnState(draftId: string) {
  const storage = getStorage();
  if (!storage) return null;
  try {
    const parsed: unknown = JSON.parse(storage.getItem(PREVIEW_RETURN_KEY) ?? "null");
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      (parsed as PreviewReturnState).draftId === draftId &&
      typeof (parsed as PreviewReturnState).returnTo === "string" &&
      typeof (parsed as PreviewReturnState).scrollY === "number" &&
      typeof (parsed as PreviewReturnState).savedAt === "string"
    ) {
      return parsed as PreviewReturnState;
    }
  } catch {
    return null;
  }
  return null;
}

export function deletePreviewReturnState(draftId?: string) {
  const storage = getStorage();
  if (!storage) return;
  try {
    if (!draftId) {
      storage.removeItem(PREVIEW_RETURN_KEY);
      return;
    }
    const current = loadPreviewReturnState(draftId);
    if (current) storage.removeItem(PREVIEW_RETURN_KEY);
  } catch {
    // Ignore cleanup failures.
  }
}
