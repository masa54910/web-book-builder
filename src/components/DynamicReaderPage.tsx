"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import {
  contentBlocksFromLegacy,
  contentBlocksToRawText,
  extractChaptersFromText,
  type BookContentBlock,
  type BookProject,
  type UploadedBookImage,
} from "@/lib/bookProject";
import { loadCanonicalPreviewProject, updateCanonicalPreviewProject } from "@/lib/canonicalPreviewStorage";
import { normalizeCoverDesign, type CoverDesign } from "@/lib/coverDesign";
import {
  normalizePageAdjustments,
  removePageAdjustment,
  upsertPageAdjustment,
  type PageAdjustment,
} from "@/lib/pageAdjustments";
import { resolveSafeInternalReturnPath } from "@/lib/returnTo";
import type { ReaderPage } from "@/lib/types";
import BookReaderShell from "./BookReaderShell";
import HomeBackLink from "./HomeBackLink";

function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(reader.error || new Error("画像を読み込めませんでした"));
    reader.readAsDataURL(file);
  });
}

function pageSourceIds(page: ReaderPage) {
  return new Set((page.sourceBlockIds || []).filter((id) => id !== page.id));
}

function findImageInsertionIndex(blocks: BookContentBlock[], page: ReaderPage | null) {
  if (!page) return blocks.length;
  const sourceIds = pageSourceIds(page);
  if (page.kind === "image") {
    sourceIds.add(page.imageId);
    sourceIds.add(page.imageIndex);
  }

  let lastSourceIndex = -1;
  blocks.forEach((block, index) => {
    if (sourceIds.has(block.id)) lastSourceIndex = index;
  });
  if (lastSourceIndex >= 0) return lastSourceIndex + 1;

  if (page.kind === "text") {
    for (const paragraph of page.paragraphs) {
      const normalized = paragraph.trim();
      if (!normalized) continue;
      blocks.forEach((block, index) => {
        if (block.type === "text" && block.content.includes(normalized)) lastSourceIndex = index;
      });
    }
  }
  return lastSourceIndex >= 0 ? lastSourceIndex + 1 : blocks.length;
}

function insertImageBlockAtPage(
  blocks: BookContentBlock[],
  imageBlock: Extract<BookContentBlock, { type: "image" }>,
  page: ReaderPage | null,
) {
  const nextBlocks = [...blocks];
  if (page?.kind === "text") {
    const lastParagraph = page.paragraphs.map((paragraph) => paragraph.trim()).filter(Boolean).at(-1);
    if (lastParagraph) {
      const sourceIds = pageSourceIds(page);
      let sourceIndex = -1;
      blocks.forEach((block, index) => {
        if (block.type === "text" && (sourceIds.has(block.id) || block.content.includes(lastParagraph))) {
          sourceIndex = index;
        }
      });
      if (sourceIndex >= 0) {
        const sourceBlock = blocks[sourceIndex];
        if (sourceBlock.type === "text") {
          const paragraphEnd = sourceBlock.content.lastIndexOf(lastParagraph) + lastParagraph.length;
          if (paragraphEnd > lastParagraph.length - 1 && paragraphEnd < sourceBlock.content.length) {
            const before = sourceBlock.content.slice(0, paragraphEnd).trimEnd();
            const after = sourceBlock.content.slice(paragraphEnd).trimStart();
            nextBlocks.splice(
              sourceIndex,
              1,
              { ...sourceBlock, content: before },
              imageBlock,
              { ...sourceBlock, id: `${sourceBlock.id}-continuation-${imageBlock.id}`, content: after },
            );
            return nextBlocks;
          }
        }
      }
    }
  }
  nextBlocks.splice(findImageInsertionIndex(blocks, page), 0, imageBlock);
  return nextBlocks;
}

function chaptersAfterContentChange(current: BookProject, rawText: string) {
  const extracted = extractChaptersFromText(rawText, current.config.title);
  return extracted.map((chapter, index) => {
    const previous = current.chapters.find((item) => item.slug === chapter.slug) || current.chapters[index];
    return previous
      ? {
          ...chapter,
          id: previous.id,
          slug: previous.slug,
          source: previous.source,
          subtitle: previous.subtitle,
        }
      : chapter;
  });
}

function uploadedImagesFromManifest(project: BookProject): UploadedBookImage[] {
  return project.images.map((image, index) => ({
    id: image.image_id || image.image_index,
    fileName: image.source_path || image.alt || `image-${index + 1}`,
    dataUrl: image.public_url || image.image_url || "",
    storagePath: image.storage_path,
    displayUrl: image.public_url || image.image_url || undefined,
    mimeType: "image/*",
    size: 0,
    caption: image.caption || "",
    insertChapter: image.chapter_title,
    orderInChapter: index,
  }));
}

export default function DynamicReaderPage() {
  const searchParams = useSearchParams();
  const [project, setProject] = useState<BookProject | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const projectRef = useRef<BookProject | null>(null);
  const persistenceChainRef = useRef(Promise.resolve());

  const isDashboardPreview =
    searchParams.get("mode") === "preview" && searchParams.get("from") === "dashboard";
  const returnTo = searchParams.get("returnTo") || "";
  const safeReturnTo = resolveSafeInternalReturnPath(returnTo);

  useEffect(() => {
    let active = true;
    loadCanonicalPreviewProject().then((loadedProject) => {
      if (!active) return;
      projectRef.current = loadedProject;
      setProject(loadedProject);
      setIsLoading(false);
    });
    return () => {
      active = false;
    };
  }, []);

  const handleCoverDesignChange = useCallback((patch: Partial<CoverDesign>) => {
    const current = projectRef.current;
    if (!current) return;
    const nextProject: BookProject = {
      ...current,
      config: {
        ...current.config,
        coverDesign: normalizeCoverDesign({ ...current.config.coverDesign, ...patch }),
      },
      updatedAt: new Date().toISOString(),
    };
    projectRef.current = nextProject;
    setProject(nextProject);
    persistenceChainRef.current = persistenceChainRef.current
      .then(() => updateCanonicalPreviewProject(nextProject))
      .catch((error) => {
        console.error("Preview cover design could not be saved", error);
      });
  }, []);

  const handlePageAdjustmentChange = useCallback((blockId: string, patch: Partial<PageAdjustment>) => {
    const current = projectRef.current;
    if (!current) return;
    const nextProject: BookProject = {
      ...current,
      config: {
        ...current.config,
        pageAdjustments: upsertPageAdjustment(current.config.pageAdjustments, blockId, patch),
      },
      updatedAt: new Date().toISOString(),
    };
    projectRef.current = nextProject;
    setProject(nextProject);
    persistenceChainRef.current = persistenceChainRef.current
      .then(() => updateCanonicalPreviewProject(nextProject))
      .catch((error) => {
        console.error("Preview page adjustment could not be saved", error);
      });
  }, []);

  const handlePageAdjustmentReset = useCallback((blockId: string) => {
    const current = projectRef.current;
    if (!current) return;
    const nextProject: BookProject = {
      ...current,
      config: {
        ...current.config,
        pageAdjustments: removePageAdjustment(current.config.pageAdjustments, blockId),
      },
      updatedAt: new Date().toISOString(),
    };
    projectRef.current = nextProject;
    setProject(nextProject);
    persistenceChainRef.current = persistenceChainRef.current
      .then(() => updateCanonicalPreviewProject(nextProject))
      .catch((error) => {
        console.error("Preview page adjustment reset could not be saved", error);
      });
  }, []);

  const handlePageAdjustmentsResetAll = useCallback(() => {
    const current = projectRef.current;
    if (!current) return;
    if (typeof window !== "undefined" && !window.confirm("ページ調整をすべて解除しますか？本文や画像そのものは削除されません。")) return;
    const nextProject: BookProject = {
      ...current,
      config: {
        ...current.config,
        pageAdjustments: normalizePageAdjustments([]),
      },
      updatedAt: new Date().toISOString(),
    };
    projectRef.current = nextProject;
    setProject(nextProject);
    persistenceChainRef.current = persistenceChainRef.current
      .then(() => updateCanonicalPreviewProject(nextProject))
      .catch((error) => {
        console.error("Preview page adjustments could not be reset", error);
      });
  }, []);

  const handlePageImageAdd = useCallback((file: File, targetPage: ReaderPage | null) => {
    if (!file.type.startsWith("image/")) return;
    void fileToDataUrl(file).then((dataUrl) => {
      const current = projectRef.current;
      if (!current) return;
      const blockId = `preview-image-${Date.now()}`;
      const imageBlock: BookContentBlock = {
        id: blockId,
        type: "image",
        storagePath: dataUrl,
        publicUrl: dataUrl,
        fileName: file.name,
        mimeType: file.type || "image/jpeg",
        width: 1200,
        height: 800,
        fitMode: "contain",
        pageMode: "full-page",
        uploadState: "ready",
      };
      const existingBlocks = current.contentBlocks?.length
        ? current.contentBlocks
        : contentBlocksFromLegacy(current.rawText, uploadedImagesFromManifest(current));
      const nextBlocks = insertImageBlockAtPage(existingBlocks, imageBlock, targetPage);
      const nextRawText = contentBlocksToRawText(nextBlocks);
      const targetChapter = targetPage && "chapterTitle" in targetPage
        ? current.chapters.find((chapter) => chapter.title === targetPage.chapterTitle)
        : current.chapters.at(-1);
      const imageRow = {
        chapter_order: targetChapter?.order || 1,
        chapter_title: targetChapter?.title || current.config.title,
        image_index: blockId,
        image_id: blockId,
        image_url: dataUrl,
        storage_path: dataUrl,
        public_url: dataUrl,
        alt: file.name,
        caption: "",
        source_path: file.name,
        local_path: "",
      };
      const nextChapters = chaptersAfterContentChange(current, nextRawText);
      const nextProject: BookProject = {
        ...current,
        chapters: nextChapters,
        rawText: nextRawText,
        contentBlocks: nextBlocks,
        images: [...current.images, imageRow],
        missingImageIds: current.missingImageIds.filter((id) => id !== blockId),
        updatedAt: new Date().toISOString(),
      };
      projectRef.current = nextProject;
      setProject(nextProject);
      persistenceChainRef.current = persistenceChainRef.current
        .then(() => updateCanonicalPreviewProject(nextProject))
        .catch((error) => {
          console.error("Preview image could not be saved", error);
        });
    }).catch((error) => {
      console.error("Preview image could not be read", error);
    });
  }, []);

  if (isLoading) {
    return <div className="reader-loading">作成中のWeb書籍を読み込んでいます…</div>;
  }

  if (!project) {
    return (
      <main className="empty-reader-page">
        <section>
          <p className="maker-kicker">WebBookMaker</p>
          {isDashboardPreview ? <Link className="maker-secondary-link home-back-link" href={safeReturnTo}>← 戻る</Link> : <HomeBackLink />}
          <h1>作成中のWeb書籍がありません</h1>
          <p>作成画面で本文と基本情報を入力し、「プレビューを作成」を押してください。</p>
          <Link className="maker-primary-link" href={isDashboardPreview ? safeReturnTo : "/"}>
            作成画面へ戻る
          </Link>
        </section>
      </main>
    );
  }

  return (
    <>
      {isDashboardPreview ? (
        <Link className="reader-preview-return" href={safeReturnTo}>
          ← 戻る
        </Link>
      ) : null}
      {project.missingImageIds.length ? (
        <aside className="reader-warning" aria-live="polite">
          不足している画像ID：{project.missingImageIds.join("、")}
        </aside>
      ) : null}
      <BookReaderShell
        config={project.config}
        chapters={project.chapters}
        images={project.images}
        contentBlocks={project.contentBlocks}
        displayMode="preview"
        editHref={isDashboardPreview ? safeReturnTo : "/"}
        onCoverDesignChange={handleCoverDesignChange}
        onPageAdjustmentChange={handlePageAdjustmentChange}
        onPageAdjustmentReset={handlePageAdjustmentReset}
        onPageAdjustmentsResetAll={handlePageAdjustmentsResetAll}
        onPageImageAdd={handlePageImageAdd}
        backLink={
          isDashboardPreview
            ? {
                href: safeReturnTo,
                label: "← 戻る",
              }
            : undefined
        }
      />
    </>
  );
}
