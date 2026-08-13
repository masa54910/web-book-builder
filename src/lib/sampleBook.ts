import fs from "node:fs";
import path from "node:path";

import { bookConfig } from "@/config/bookConfig";
import { importBook } from "@/lib/book/importBook";
import type { CoverDesign } from "@/lib/coverDesign";
import {
  SAMPLE_BOOK_AUTHOR,
  SAMPLE_BOOK_COVER_IMAGE,
  SAMPLE_BOOK_DISPLAY_TITLE_LINES,
  SAMPLE_BOOK_SLUG,
  SAMPLE_BOOK_TITLE,
} from "@/lib/sampleBookConstants";

function readSampleBookFile(name: string) {
  return fs.readFileSync(path.join(process.cwd(), "src", "data", "sample-book", name), "utf8");
}

export function loadSampleBookProject() {
  const imported = importBook({
    text: readSampleBookFile("book.txt"),
    chapterManifestCsv: readSampleBookFile("article-manifest.csv"),
    imageManifestCsv: readSampleBookFile("image-manifest.csv"),
  });

  return {
    slug: SAMPLE_BOOK_SLUG,
    config: {
      ...bookConfig,
      title: SAMPLE_BOOK_TITLE,
      displayTitleLines: [...SAMPLE_BOOK_DISPLAY_TITLE_LINES],
      author: SAMPLE_BOOK_AUTHOR,
      coverImage: SAMPLE_BOOK_COVER_IMAGE,
      coverDesign: {
        layout: "layout-10",
        titleTextOverride: SAMPLE_BOOK_DISPLAY_TITLE_LINES.join("\n"),
        titleScale: 0.92,
        titlePosition: "bottom-left",
        authorScale: 0.92,
        authorPosition: "bottom-right",
        imageScale: 1,
        imageFit: "cover",
        imagePosition: "center",
        overlayOpacity: 0,
      } satisfies CoverDesign,
      description:
        "Webブックを作りました。本物の本のようにページめくりができます。読んでいて気持ちが良い体験です。",
    },
    chapters: imported.chapters,
    images: imported.images,
  };
}
