"use client";

import {
  buildBookProjectFromCanonicalPayload,
  type CanonicalBookPayload,
} from "@/lib/canonicalBook";
import { type BookProject } from "@/lib/bookProject";
import { normalizeBookProject } from "@/lib/bookProjectNormalization";
import { materializeBookProjectAssets } from "@/lib/bookAssetStorage";
import { PREVIEW_POINTER_KEY } from "@/lib/browserBookStorage";

const DATABASE_NAME = "webBookMaker";
const DATABASE_VERSION = 1;
const PROJECT_STORE = "projects";
const CURRENT_PREVIEW_ID = "current";

export type CanonicalPreviewResult =
  | { ok: true; project: BookProject; previewId: string }
  | { ok: false; errors: Record<string, string> };

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
      reject(new Error("IndexedDB is unavailable"));
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
    request.onerror = () => reject(request.error ?? new Error("Unable to open IndexedDB"));
  });
}

async function withProjectStore<T>(
  mode: IDBTransactionMode,
  action: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const database = await openDatabase();
  return new Promise<T>((resolve, reject) => {
    const transaction = database.transaction(PROJECT_STORE, mode);
    const store = transaction.objectStore(PROJECT_STORE);
    const request = action(store);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("IndexedDB request failed"));
    transaction.oncomplete = () => database.close();
    transaction.onerror = () => {
      database.close();
      reject(transaction.error ?? new Error("IndexedDB transaction failed"));
    };
  });
}

export async function saveCanonicalPreview(
  payload: CanonicalBookPayload,
): Promise<CanonicalPreviewResult> {
  const build = buildBookProjectFromCanonicalPayload(payload);
  if (!build.ok) return build;

  await withProjectStore("readwrite", (store) =>
    store.put(build.project, CURRENT_PREVIEW_ID),
  );

  try {
    getStorage()?.setItem(
      PREVIEW_POINTER_KEY,
      JSON.stringify({
        bookId: build.project.config.bookId,
        title: build.project.config.title,
        savedAt: build.project.updatedAt,
      }),
    );
  } catch {
    // IndexedDB remains the source for this preview if localStorage is unavailable.
  }

  return {
    ok: true,
    project: build.project,
    previewId: build.project.config.bookId,
  };
}

/**
 * Persist an in-preview adjustment without creating a second preview format.
 * The BookProject is the materialized form of the current Canonical payload,
 * so returning to the editor can consume the same preview state exactly once.
 */
export async function updateCanonicalPreviewProject(project: BookProject): Promise<void> {
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
    // IndexedDB remains the source for this preview if localStorage is unavailable.
  }
}

export async function loadCanonicalPreviewProject(): Promise<BookProject | null> {
  try {
    const value = await withProjectStore<unknown>("readonly", (store) =>
      store.get(CURRENT_PREVIEW_ID),
    );
    const normalized = normalizeBookProject(value);
    if (!normalized) return null;
    // Refresh signed URLs on every Preview open while retaining storagePath
    // values as the canonical references for the editor and future saves.
    return await materializeBookProjectAssets(normalized);
  } catch {
    return null;
  }
}

export async function deleteCanonicalPreview(): Promise<void> {
  try {
    await withProjectStore("readwrite", (store) => store.delete(CURRENT_PREVIEW_ID));
  } catch {
    // Preview cleanup is best-effort and must not block navigation.
  }
  try {
    getStorage()?.removeItem(PREVIEW_POINTER_KEY);
  } catch {
    // Storage may be unavailable in privacy modes.
  }
}
