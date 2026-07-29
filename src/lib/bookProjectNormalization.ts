import { bookConfig } from "@/config/bookConfig";
import { BOOK_PROJECT_VERSION, isBookProject, type BookProject } from "@/lib/bookProject";

export function normalizeBookProject(value: unknown): BookProject | null {
  if (isBookProject(value)) {
    return {
      ...value,
      version: BOOK_PROJECT_VERSION,
      config: {
        ...bookConfig,
        ...value.config,
        bookId: value.config.bookId || `normalized-${Date.now()}`,
        title: value.config.title || "無題のWeb書籍",
        author: value.config.author || "作者未設定",
        bindingDirection: value.config.bindingDirection === "ltr" ? "ltr" : "rtl",
        theme: ["classic", "modern", "minimal"].includes(value.config.theme)
          ? value.config.theme
          : "classic",
      },
      chapters: Array.isArray(value.chapters) ? value.chapters : [],
      images: Array.isArray(value.images) ? value.images : [],
      missingImageIds: Array.isArray(value.missingImageIds) ? value.missingImageIds : [],
    };
  }
  return null;
}

export function parseBookProjectJson(source: unknown) {
  try {
    if (typeof source === "string") return normalizeBookProject(JSON.parse(source));
    return normalizeBookProject(source);
  } catch {
    return null;
  }
}
