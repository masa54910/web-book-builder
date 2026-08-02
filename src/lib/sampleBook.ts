import fs from "node:fs";
import path from "node:path";

import { bookConfig } from "@/config/bookConfig";
import { importBook } from "@/lib/book/importBook";
import {
  SAMPLE_BOOK_AUTHOR,
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
      description:
        "WebBookMakerの基本機能を体験できる公式サンプルです。ページめくり、目次、共有導線まで実際の公開導線で確認できます。",
    },
    chapters: imported.chapters,
    images: imported.images,
  };
}
