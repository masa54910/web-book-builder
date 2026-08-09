"use client";

import type { ReaderPage } from "@/lib/types";

function pageLabel(page: ReaderPage) {
  switch (page.kind) {
    case "cover":
      return "表紙";
    case "title":
      return "タイトル";
    case "contents":
      return "目次";
    case "chapterTitle":
      return page.chapterTitle;
    case "text":
      return page.chapterTitle;
    case "image":
      return page.caption || "画像ページ";
    case "colophon":
      return "奥付";
    case "backCover":
      return "裏表紙";
    case "pageBreak":
      return "改ページ";
    default:
      return "ページ";
  }
}

function MiniPageContent({ page }: { page: ReaderPage }) {
  if (page.kind === "image") {
    return (
      <div className="editor-mini-page-image">
        {page.src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={page.src} alt="" loading="lazy" />
        ) : <span>画像</span>}
      </div>
    );
  }
  if (page.kind === "cover" || page.kind === "backCover") {
    return <div className="editor-mini-page-cover"><span>{page.kind === "cover" ? "WebBook" : ""}</span></div>;
  }
  if (page.kind === "chapterTitle") {
    return <div className="editor-mini-page-heading"><strong>{page.chapterTitle}</strong><i /><i /><i /></div>;
  }
  if (page.kind === "contents") {
    return <div className="editor-mini-page-lines"><strong>目次</strong><i /><i /><i /><i /></div>;
  }
  if (page.kind === "colophon" || page.kind === "pageBreak") {
    return <div className="editor-mini-page-lines"><strong>{page.kind === "colophon" ? "奥付" : "改ページ"}</strong><i /><i /></div>;
  }
  if (page.kind === "title") {
    return <div className="editor-mini-page-heading"><strong>タイトル</strong><i /><i /></div>;
  }
  return (
    <div className="editor-mini-page-lines">
      {page.paragraphs.slice(0, 6).map((paragraph, index) => (
        <span key={`${page.id}-${index}`}>
          {paragraph.replace(/\s+/g, " ").slice(0, 46) || "本文"}
        </span>
      ))}
      {!page.paragraphs.length ? <i /> : null}
    </div>
  );
}

export default function EditorMiniPreview({
  pages,
  activePageId,
}: {
  pages: ReaderPage[];
  activePageId?: string | null;
}) {
  return (
    <section className="editor-mini-preview" aria-label="ページ一覧ミニプレビュー">
      <div className="editor-mini-preview-heading">
        <div>
          <p className="maker-kicker">Mini preview</p>
          <h2>ページ一覧</h2>
        </div>
        <strong>{pages.length}ページ</strong>
      </div>
      <p className="maker-note editor-mini-preview-note">本文の全体構成を確認できます。正式Previewとは分離した簡易表示です。</p>
      <div className="editor-mini-preview-list">
        {pages.map((page, index) => (
          <article
            className={`editor-mini-page ${activePageId === page.id ? "is-active" : ""}`}
            key={page.id}
            aria-current={activePageId === page.id ? "page" : undefined}
          >
            <div className="editor-mini-page-frame"><MiniPageContent page={page} /></div>
            <div className="editor-mini-page-meta">
              <strong>Page {index + 1}</strong>
              <span>{pageLabel(page)}</span>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
