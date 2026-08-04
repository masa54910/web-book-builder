import { bookConfig } from "@/config/bookConfig";
import {
  BOOK_PROJECT_VERSION,
  contentBlocksFromLegacy,
  isBookProject,
  type BookProject,
  type UploadedBookImage,
} from "@/lib/bookProject";

export function normalizeBookProject(value: unknown): BookProject | null {
  if (isBookProject(value)) {
    const normalizedImages: UploadedBookImage[] = Array.isArray(value.images)
      ? value.images.map((image, index) => ({
          id: image.image_id || image.image_index || `image-${index + 1}`,
          fileName: image.source_path || image.alt || `image-${index + 1}`,
          dataUrl: image.image_url,
          mimeType: image.image_url.startsWith("data:image/png")
            ? "image/png"
            : image.image_url.startsWith("data:image/webp")
              ? "image/webp"
              : "image/jpeg",
          size: 0,
          caption: image.caption,
          insertChapter: image.chapter_order ? String(image.chapter_order) : "",
          orderInChapter: index + 1,
        }))
      : [];

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
        theme: ["classic", "modern", "minimal", "magazine", "novel", "photo", "research", "portfolio"].includes(value.config.theme)
          ? value.config.theme
          : "classic",
      },
      chapters: Array.isArray(value.chapters) ? value.chapters : [],
      images: Array.isArray(value.images) ? value.images : [],
      contentBlocks:
        Array.isArray(value.contentBlocks) && value.contentBlocks.length
          ? value.contentBlocks
          : contentBlocksFromLegacy(value.rawText, normalizedImages),
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
