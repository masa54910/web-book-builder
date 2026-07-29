"use client";

import { isBookProject, type BookProject } from "@/lib/bookProject";

export const DRAFT_STORAGE_KEY = "webBookMaker:draft:current";
export const PREVIEW_POINTER_KEY = "webBookMaker:preview:current";

const DATABASE_NAME = "webBookMaker";
const DATABASE_VERSION = 1;
const PROJECT_STORE = "projects";
const CURRENT_PREVIEW_ID = "current";

export type MakerDraft = {
  version: 1;
  fields: Record<string, unknown>;
  savedAt: string;
};

function getStorage() {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!("indexedDB" in window)) {
      reject(new Error("IndexedDBを利用できません。"));
      return;
    }

    const request = window.indexedDB.open(DATABASE_NAME, DATABASE_VERSION);

    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(PROJECT_STORE)) {
        database.createObjectStore(PROJECT_STORE);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("IndexedDBを開けませんでした。"));
  });
}

async function withProjectStore<T>(
  mode: IDBTransactionMode,
  action: (store: IDBObjectStore) => IDBRequest<T>,
) {
  const database = await openDatabase();
  return new Promise<T>((resolve, reject) => {
    const transaction = database.transaction(PROJECT_STORE, mode);
    const store = transaction.objectStore(PROJECT_STORE);
    const request = action(store);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("IndexedDB操作に失敗しました。"));
    transaction.oncomplete = () => database.close();
    transaction.onerror = () => {
      database.close();
      reject(transaction.error ?? new Error("IndexedDBトランザクションに失敗しました。"));
    };
  });
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

export async function savePreviewProject(project: BookProject) {
  await withProjectStore("readwrite", (store) => store.put(project, CURRENT_PREVIEW_ID));
  try {
    getStorage()?.setItem(
      PREVIEW_POINTER_KEY,
      JSON.stringify({
        bookId: project.config.bookId,
        title: project.config.title,
        savedAt: project.updatedAt,
      }),
    );
  } catch {
    // The project itself remains available in IndexedDB if localStorage fails.
  }
}

export async function loadPreviewProject() {
  try {
    const value = await withProjectStore<unknown>("readonly", (store) =>
      store.get(CURRENT_PREVIEW_ID),
    );
    return isBookProject(value) ? value : null;
  } catch {
    return null;
  }
}

export async function deletePreviewProject() {
  try {
    await withProjectStore("readwrite", (store) => store.delete(CURRENT_PREVIEW_ID));
  } catch {
    // Ignore cleanup failures.
  }
  try {
    getStorage()?.removeItem(PREVIEW_POINTER_KEY);
  } catch {
    // Ignore cleanup failures.
  }
}
