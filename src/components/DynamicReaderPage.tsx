"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import { contentBlocksToRawText, type BookContentBlock, type BookProject } from "@/lib/bookProject";
import { loadCanonicalPreviewProject, updateCanonicalPreviewProject } from "@/lib/canonicalPreviewStorage";
import { normalizeCoverDesign, type CoverDesign } from "@/lib/coverDesign";
import {
  normalizePageAdjustments,
  removePageAdjustment,
  upsertPageAdjustment,
  type PageAdjustment,
} from "@/lib/pageAdjustments";
import { resolveSafeInternalReturnPath } from "@/lib/returnTo";
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

  const handlePageImageAdd = useCallback((file: File) => {
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
      const nextBlocks = [...(current.contentBlocks || []), imageBlock];
      const imageRow = {
        chapter_order: current.chapters.at(-1)?.order || 1,
        chapter_title: current.chapters.at(-1)?.title || current.config.title,
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
      const imageToken = `[[image:${blockId}||full-page]]`;
      const nextChapters = current.chapters.length
        ? current.chapters.map((chapter, index) =>
            index === current.chapters.length - 1
              ? { ...chapter, body: `${chapter.body}\n\n${imageToken}` }
              : chapter,
          )
        : [{
            id: "chapter-01",
            order: 1,
            title: current.config.title || "作品",
            slug: "chapter-01",
            source: "preview-upload",
            body: imageToken,
          }];
      const nextProject: BookProject = {
        ...current,
        chapters: nextChapters,
        rawText: contentBlocksToRawText(nextBlocks),
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
