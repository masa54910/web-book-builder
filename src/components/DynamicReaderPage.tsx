"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import type { BookProject } from "@/lib/bookProject";
import { loadCanonicalPreviewProject, updateCanonicalPreviewProject } from "@/lib/canonicalPreviewStorage";
import { normalizeCoverDesign, type CoverDesign } from "@/lib/coverDesign";
import { resolveSafeInternalReturnPath } from "@/lib/returnTo";
import BookReaderShell from "./BookReaderShell";
import HomeBackLink from "./HomeBackLink";

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
