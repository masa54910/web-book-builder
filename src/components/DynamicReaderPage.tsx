"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import type { BookProject } from "@/lib/bookProject";
import { loadPreviewProject } from "@/lib/browserBookStorage";
import { resolveSafeInternalReturnPath } from "@/lib/returnTo";
import BookReaderShell from "./BookReaderShell";
import HomeBackLink from "./HomeBackLink";

const PUBLIC_SHARE_HOME_URL = "https://webbookmaker.vercel.app/";

export default function DynamicReaderPage() {
  const searchParams = useSearchParams();
  const [project, setProject] = useState<BookProject | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const isDashboardPreview =
    searchParams.get("mode") === "preview" && searchParams.get("from") === "dashboard";
  const returnTo = searchParams.get("returnTo") || "";
  const safeReturnTo = resolveSafeInternalReturnPath(returnTo);

  useEffect(() => {
    let active = true;
    loadPreviewProject().then((loadedProject) => {
      if (!active) return;
      setProject(loadedProject);
      setIsLoading(false);
    });
    return () => {
      active = false;
    };
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
        editHref={isDashboardPreview ? safeReturnTo : "/"}
        shareUrl={PUBLIC_SHARE_HOME_URL}
        shareDescription="WebBookMakerで作成中"
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
