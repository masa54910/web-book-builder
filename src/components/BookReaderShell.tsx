"use client";

import dynamic from "next/dynamic";
import type { BookConfig } from "@/config/bookConfig";
import type { ImageManifestRow, NovelChapter } from "@/lib/types";

const BookReader = dynamic(() => import("./BookReader"), {
  ssr: false,
  loading: () => <div className="reader-loading">OPENING THE BOOK…</div>,
});

export default function BookReaderShell({
  config,
  chapters,
  images,
  editHref,
  cloudBookId,
}: {
  config: BookConfig;
  chapters: NovelChapter[];
  images: ImageManifestRow[];
  editHref?: string;
  cloudBookId?: string;
}) {
  return (
    <BookReader
      config={config}
      chapters={chapters}
      images={images}
      editHref={editHref}
      cloudBookId={cloudBookId}
    />
  );
}
