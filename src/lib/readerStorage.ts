export type StickyNote = {
  pageIndex: number;
  pageNumber: number;
  pageId: string;
  chapterTitle: string;
  preview: string;
};

export type LastRead = {
  pageIndex: number;
  pageNumber: number;
  pageId: string;
  chapterTitle: string;
  savedAt: string;
};

export function storageKeys(bookId: string) {
  return {
    stickyNotes: `webBookBuilder:${bookId}:stickyNotes`,
    lastRead: `webBookBuilder:${bookId}:lastRead`,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

type StoredPage = {
  pageIndex: number;
  pageNumber: number;
  pageId: string;
  chapterTitle: string;
};

function isStoredPage(
  value: unknown,
): value is StoredPage & Record<string, unknown> {
  return (
    isRecord(value) &&
    Number.isInteger(value.pageIndex) &&
    typeof value.pageNumber === "number" &&
    typeof value.pageId === "string" &&
    typeof value.chapterTitle === "string"
  );
}

export function readStickyNotes(storage: Storage | null, bookId: string): StickyNote[] {
  if (!storage) return [];
  try {
    const value: unknown = JSON.parse(storage.getItem(storageKeys(bookId).stickyNotes) ?? "[]");
    if (!Array.isArray(value)) return [];
    return value.filter(
      (note): note is StickyNote => isStoredPage(note) && typeof note.preview === "string",
    );
  } catch {
    return [];
  }
}

export function writeStickyNotes(storage: Storage | null, bookId: string, notes: StickyNote[]) {
  if (!storage) return;
  try {
    storage.setItem(storageKeys(bookId).stickyNotes, JSON.stringify(notes));
  } catch {
    // Storage may be unavailable in privacy modes.
  }
}

export function readLastRead(storage: Storage | null, bookId: string): LastRead | null {
  if (!storage) return null;
  try {
    const value: unknown = JSON.parse(storage.getItem(storageKeys(bookId).lastRead) ?? "null");
    return isStoredPage(value) && typeof value.savedAt === "string"
      ? (value as LastRead)
      : null;
  } catch {
    return null;
  }
}

export function writeLastRead(storage: Storage | null, bookId: string, position: LastRead) {
  if (!storage) return;
  try {
    storage.setItem(storageKeys(bookId).lastRead, JSON.stringify(position));
  } catch {
    // Storage may be unavailable in privacy modes.
  }
}
