"use client";

import dynamic from "next/dynamic";
import type { BookConfig } from "@/config/bookConfig";
import type { BookContentBlock } from "@/lib/bookProject";
import type { CoverDesign } from "@/lib/coverDesign";
import type { ImageManifestRow, NovelChapter } from "@/lib/types";

const BookReader = dynamic(() => import("./BookReader"), {
  ssr: false,
  loading: () => <div className="reader-loading">OPENING THE BOOK…</div>,
});

export default function BookReaderShell({
  config,
  chapters,
  images,
  contentBlocks,
  displayMode = "published",
  editHref,
  cloudBookId,
  shareUrl,
  shareDescription,
  shareDisabledReason,
  authorPageHandle,
  backLink,
  onCoverDesignChange,
}: {
  config: BookConfig;
  chapters: NovelChapter[];
  images: ImageManifestRow[];
  contentBlocks?: BookContentBlock[];
  displayMode?: "preview" | "published";
  editHref?: string;
  cloudBookId?: string;
  shareUrl?: string;
  shareDescription?: string;
  shareDisabledReason?: string;
  authorPageHandle?: string | null;
  onCoverDesignChange?: (patch: Partial<CoverDesign>) => void;
  backLink?: {
    destination?: "auto" | "home" | "dashboard";
    href?: string;
    label?: string;
  };
}) {
  return (
    <BookReader
      config={config}
      chapters={chapters}
      images={images}
      contentBlocks={contentBlocks}
      displayMode={displayMode}
      editHref={editHref}
      cloudBookId={cloudBookId}
      shareUrl={shareUrl}
      shareDescription={shareDescription ?? config.description}
      shareDisabledReason={shareDisabledReason}
      authorPageHandle={authorPageHandle}
      backLink={backLink}
      onCoverDesignChange={onCoverDesignChange}
    />
  );
}
