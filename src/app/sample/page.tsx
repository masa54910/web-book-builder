import fs from "node:fs";
import path from "node:path";

import BookReaderShell from "@/components/BookReaderShell";
import { bookConfig } from "@/config/bookConfig";
import { importBook } from "@/lib/book/importBook";

function readSampleBookFile(name: string) {
  return fs.readFileSync(path.join(process.cwd(), "src", "data", "sample-book", name), "utf8");
}

export default function SamplePage() {
  const book = importBook({
    text: readSampleBookFile("book.txt"),
    chapterManifestCsv: readSampleBookFile("article-manifest.csv"),
    imageManifestCsv: readSampleBookFile("image-manifest.csv"),
  });

  return (
    <BookReaderShell
      config={bookConfig}
      chapters={book.chapters}
      images={book.images}
      editHref="/"
    />
  );
}
