"use client";

export const DRAFT_STORAGE_KEY = "webBookMaker:draft:current";
export const PREVIEW_POINTER_KEY = "webBookMaker:preview:current";
export const PREVIEW_RETURN_KEY = "webBookMaker:preview:return";

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

function getStorage() {
  try {
    return window.localStorage;
  } catch {
    return null;
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
