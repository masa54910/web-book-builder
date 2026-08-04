"use client";

import HTMLFlipBook from "react-pageflip";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";

import type { BookConfig } from "@/config/bookConfig";
import { buildReaderPages, toBoundPageOrder } from "@/lib/paginateText";
import { recordReaderProgress } from "@/lib/readerAnalytics";
import { themeClassNames } from "@/lib/themeSystem";
import {
  readLastRead,
  readStickyNotes,
  writeLastRead,
  writeStickyNotes,
} from "@/lib/readerStorage";
import type { LastRead, StickyNote } from "@/lib/readerStorage";
import type { ImageManifestRow, NovelChapter, ReaderPage } from "@/lib/types";
import BookPage from "./BookPage";
import ChapterTitlePage from "./ChapterTitlePage";
import ColophonPage from "./ColophonPage";
import ContentsPage from "./ContentsPage";
import CoverPage from "./CoverPage";
import ImagePage from "./ImagePage";
import ReaderControls from "./ReaderControls";
import ReadingTools from "./ReadingTools";
import ShareTools from "./ShareTools";
import TextPage from "./TextPage";
import TitlePage from "./TitlePage";
import HomeBackLink from "./HomeBackLink";

function getSafeLocalStorage() {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

type PageFlipApi = {
  flipNext: (corner?: "top" | "bottom") => void;
  flipPrev: (corner?: "top" | "bottom") => void;
  turnToPage: (page: number) => void;
};

type FlipBookHandle = {
  pageFlip: () => PageFlipApi;
};

export default function BookReader({
  config,
  chapters,
  images,
  editHref,
  cloudBookId,
  backLink,
}: {
  config: BookConfig;
  chapters: NovelChapter[];
  images: ImageManifestRow[];
  editHref?: string;
  cloudBookId?: string;
  backLink?: {
    destination?: "auto" | "home" | "dashboard";
    href?: string;
    label?: string;
  };
}) {
  const flipBookRef = useRef<FlipBookHandle | null>(null);
  const storage = useMemo(() => getSafeLocalStorage(), []);
  const [isMobile, setIsMobile] = useState(() =>
    typeof window === "undefined" ? false : window.matchMedia("(max-width: 760px)").matches,
  );
  const [currentPage, setCurrentPage] = useState(0);
  const [stickyNotes, setStickyNotes] = useState<StickyNote[]>(() =>
    readStickyNotes(getSafeLocalStorage(), config.bookId),
  );
  const [resumePosition, setResumePosition] = useState<LastRead | null>(() =>
    readLastRead(getSafeLocalStorage(), config.bookId),
  );
  const [autoFlipEnabled, setAutoFlipEnabled] = useState(false);
  const [autoFlipSeconds, setAutoFlipSeconds] = useState(5);
  const [autoFlipLoop, setAutoFlipLoop] = useState(false);
  const [autoFlipStartMode, setAutoFlipStartMode] = useState<"cover" | "current">("current");

  useEffect(() => {
    const media = window.matchMedia("(max-width: 760px)");
    const update = () => {
      setCurrentPage(0);
      setIsMobile(media.matches);
    };
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  const logicalPages = useMemo(
    () =>
      buildReaderPages({
        chapters,
        images,
        charactersPerPage: isMobile
          ? Math.max(220, Math.floor(config.charactersPerPage * 0.82))
          : config.charactersPerPage,
        tableOfContentsItemsPerPage: config.tableOfContentsItemsPerPage,
      }),
    [chapters, config.charactersPerPage, config.tableOfContentsItemsPerPage, images, isMobile],
  );
  const pages = useMemo(
    () => toBoundPageOrder(logicalPages, isMobile, config.bindingDirection),
    [config.bindingDirection, logicalPages, isMobile],
  );
  const logicalFolioById = useMemo(
    () => new Map(logicalPages.map((page, index) => [page.id, index])),
    [logicalPages],
  );

  const pageDetails = useCallback(
    (pageIndex: number) => {
      const page = pages[pageIndex];
      if (!page) return null;
      const chapterTitle =
        "chapterTitle" in page
          ? page.chapterTitle
          : page.kind === "cover"
            ? "表紙"
            : page.kind === "title"
              ? "タイトルページ"
              : page.kind === "contents"
                ? "目次"
                : page.kind === "colophon"
                  ? "奥付"
                  : "裏表紙";
      const preview =
        page.kind === "text"
          ? page.paragraphs.join(" ").replace(/\s+/g, " ").trim().slice(0, 72)
          : page.kind === "image"
            ? page.caption || `本文画像 ${page.imageIndex}`
            : page.kind === "chapterTitle"
              ? "章扉"
              : chapterTitle;
      return {
        pageIndex,
        pageNumber: logicalFolioById.get(page.id) ?? pageIndex,
        pageId: page.id,
        chapterTitle,
        preview,
      };
    },
    [logicalFolioById, pages],
  );

  const saveLastReadAt = useCallback(
    (pageIndex: number) => {
      if (pageIndex <= 0) return;
      const details = pageDetails(pageIndex);
      if (!details) return;
      writeLastRead(storage, config.bookId, {
        pageIndex: details.pageIndex,
        pageNumber: details.pageNumber,
        pageId: details.pageId,
        chapterTitle: details.chapterTitle,
        savedAt: new Date().toISOString(),
      });
    },
    [config.bookId, pageDetails, storage],
  );

  const pageFlip = useCallback(() => flipBookRef.current?.pageFlip(), []);
  const goToPage = useCallback(
    (pageIndex: number) => {
      if (pageIndex < 0 || pageIndex >= pages.length) return;
      pageFlip()?.turnToPage(pageIndex);
      saveLastReadAt(pageIndex);
    },
    [pageFlip, pages.length, saveLastReadAt],
  );
  const jumpToId = useCallback(
    (id: string) => {
      const pageIndex = pages.findIndex((page) => page.id === id);
      if (pageIndex >= 0) goToPage(pageIndex);
    },
    [goToPage, pages],
  );
  const jumpToPrintedPage = useCallback(
    (pageNumber: number) => {
      const pageIndex = isMobile
        ? pageNumber
        : Math.max(1, pageNumber % 2 === 0 ? pageNumber - 1 : pageNumber);
      goToPage(Math.min(pageIndex, pages.length - 2));
    },
    [goToPage, isMobile, pages.length],
  );

  const currentSpreadPageIds = useMemo(
    () =>
      new Set(
        [currentPage - 1, currentPage, currentPage + 1]
          .map((pageIndex) => pages[pageIndex]?.id)
          .filter((pageId): pageId is string => Boolean(pageId)),
      ),
    [currentPage, pages],
  );
  const hasBookmarkInCurrentSpread = useMemo(
    () => stickyNotes.some((note) => currentSpreadPageIds.has(note.pageId)),
    [currentSpreadPageIds, stickyNotes],
  );

  const toggleStickyNote = useCallback(() => {
    const details = pageDetails(currentPage);
    if (!details) return;
    setStickyNotes((current) => {
      const nearbyNote = current.find((note) => currentSpreadPageIds.has(note.pageId));
      const next = nearbyNote
        ? current.filter((note) => note.pageId !== nearbyNote.pageId)
        : [...current, details].sort((left, right) => left.pageNumber - right.pageNumber);
      writeStickyNotes(storage, config.bookId, next);
      return next;
    });
  }, [config.bookId, currentPage, currentSpreadPageIds, pageDetails, storage]);

  const removeStickyNote = useCallback(
    (note: StickyNote) => {
      setStickyNotes((current) => {
        const next = current.filter((item) => item.pageId !== note.pageId);
        writeStickyNotes(storage, config.bookId, next);
        return next;
      });
    },
    [config.bookId, storage],
  );

  const jumpToStickyNote = useCallback(
    (note: StickyNote) => {
      const stableIndex = pages.findIndex((page) => page.id === note.pageId);
      goToPage(stableIndex >= 0 ? stableIndex : Math.min(note.pageIndex, pages.length - 1));
    },
    [goToPage, pages],
  );

  const continueReading = useCallback(() => {
    if (!resumePosition) return;
    const stableIndex = pages.findIndex((page) => page.id === resumePosition.pageId);
    goToPage(
      stableIndex >= 0
        ? stableIndex
        : Math.min(Math.max(resumePosition.pageIndex, 0), pages.length - 1),
    );
    setResumePosition(null);
  }, [goToPage, pages, resumePosition]);

  const bookmarkedPageIds = useMemo(
    () => new Set(stickyNotes.map((note) => note.pageId)),
    [stickyNotes],
  );

  const readerStyle = useMemo(() => {
    const settings = config.themeSettings;
    const style: CSSProperties & Record<string, string | undefined> = {};
    if (settings?.textColor) style["--book-text-color"] = settings.textColor;
    if (settings?.accentColor) style["--book-accent-color"] = settings.accentColor;
    return style;
  }, [config.themeSettings]);

  const displayTitleLines = useMemo(
    () => config.displayTitleLines?.filter((line) => line.trim().length > 0),
    [config.displayTitleLines],
  );

  const toggleAutoFlip = useCallback(() => {
    setAutoFlipEnabled((enabled) => {
      const nextEnabled = !enabled;
      if (!enabled && autoFlipStartMode === "cover") goToPage(0);
      return nextEnabled;
    });
  }, [autoFlipStartMode, goToPage]);

  useEffect(() => {
    if (!autoFlipEnabled) return;
    const timer = window.setInterval(() => {
      if (currentPage >= pages.length - 1) {
        if (autoFlipLoop) {
          goToPage(0);
        } else {
          setAutoFlipEnabled(false);
        }
        return;
      }
      pageFlip()?.flipNext("top");
    }, Math.max(2, autoFlipSeconds) * 1000);
    return () => window.clearInterval(timer);
  }, [autoFlipEnabled, autoFlipLoop, autoFlipSeconds, currentPage, goToPage, pageFlip, pages.length]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const nextKey = config.bindingDirection === "rtl" ? "ArrowLeft" : "ArrowRight";
      const previousKey = config.bindingDirection === "rtl" ? "ArrowRight" : "ArrowLeft";
      if (event.key === nextKey) {
        event.preventDefault();
        pageFlip()?.flipNext("top");
      } else if (event.key === previousKey) {
        event.preventDefault();
        pageFlip()?.flipPrev("top");
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [config.bindingDirection, pageFlip]);

  const renderPage = (page: ReaderPage) => {
    let content: React.ReactNode;
    if (page.kind === "cover") content = <CoverPage config={config} />;
    else if (page.kind === "title") content = <TitlePage config={config} />;
    else if (page.kind === "contents") {
      content = (
        <ContentsPage
          chapters={chapters.slice(page.chapterStart, page.chapterEnd)}
          startIndex={page.chapterStart}
          part={page.part}
          totalParts={page.totalParts}
          onJump={(slug) => jumpToId(`chapter-${slug}`)}
        />
      );
    } else if (page.kind === "chapterTitle") {
      content = <ChapterTitlePage title={page.chapterTitle} order={page.chapterOrder} series={config.title} />;
    } else if (page.kind === "text") {
      const chapterIndex = chapters.findIndex((chapter) => chapter.title === page.chapterTitle);
      const previousChapter = chapterIndex > 0 ? chapters[chapterIndex - 1] : undefined;
      content = (
        <TextPage
          bookTitle={config.title}
          chapterTitle={page.chapterTitle}
          paragraphs={page.paragraphs}
          previousChapterTitle={previousChapter?.title}
          onJumpToPrevious={
            previousChapter ? () => jumpToId(`chapter-${previousChapter.slug}`) : undefined
          }
        />
      );
    } else if (page.kind === "image") {
      content = (
        <ImagePage
          src={page.src}
          alt={page.alt}
          caption={page.caption}
          missing={page.missing}
        />
      );
    } else if (page.kind === "colophon") content = <ColophonPage config={config} cloudBookId={cloudBookId} />;
    else content = <CoverPage config={config} back />;

    const hard = page.kind === "cover" || page.kind === "backCover";
    const logicalFolio = logicalFolioById.get(page.id) ?? 0;
    return (
      <BookPage
        key={page.id}
        label={page.kind === "text" || page.kind === "image" ? page.chapterTitle : page.kind}
        folio={hard ? undefined : logicalFolio}
        hard={hard}
        bookmarked={bookmarkedPageIds.has(page.id)}
      >
        {content}
      </BookPage>
    );
  };

  const directionLabel =
    config.bindingDirection === "rtl" ? "RIGHT-BOUND · 次へは左方向 ←" : "LEFT-BOUND · 次へは右方向 →";
  const helpText =
    config.bindingDirection === "rtl"
      ? "左矢印キーで次へ、右矢印キーで前へ。ページの角をドラッグ、またはタップしても移動できます。"
      : "右矢印キーで次へ、左矢印キーで前へ。ページの角をドラッグ、またはタップしても移動できます。";

  return (
    <main className={`reader-shell ${themeClassNames(config.theme, config.themeSettings)}`} style={readerStyle}>
      <header className="reader-masthead">
        <div>
          <p className="reader-kicker">Digital Book Builder · Static Preview</p>
          {displayTitleLines?.length ? (
            <h1 className="fixed-title-lines fixed-title-lines-masthead" aria-label={config.title}>
              {displayTitleLines.map((line) => (
                <span key={line}>{line}</span>
              ))}
            </h1>
          ) : (
            <h1>{config.title}</h1>
          )}
          {config.authorProfile?.handle ? (
            <a className="reader-author-link" href={`/authors/${config.authorProfile.handle}`}>
              @{config.authorProfile.handle} の作者ページ
            </a>
          ) : null}
        </div>
        <div className="reader-masthead-actions">
          {backLink?.href ? (
            <Link className="reader-edit-link" href={backLink.href}>
              {backLink.label || "← 戻る"}
            </Link>
          ) : (
            <HomeBackLink
              className="reader-edit-link"
              destination={backLink?.destination}
              label={backLink?.label}
            />
          )}
          {editHref ? (
            <a className="reader-edit-link" href={editHref}>
              編集画面へ戻る
            </a>
          ) : null}
          <span className="reader-direction">{directionLabel}</span>
        </div>
      </header>

      <section className="book-viewport" aria-label="デジタル書籍リーダー">
        <HTMLFlipBook
          key={`${isMobile ? "mobile" : "desktop"}-${pages.length}`}
          ref={flipBookRef}
          className="flip-book"
          style={{}}
          startPage={0}
          size="stretch"
          width={isMobile ? 340 : 430}
          height={isMobile ? 560 : 620}
          minWidth={280}
          maxWidth={470}
          minHeight={470}
          maxHeight={660}
          drawShadow
          flippingTime={780}
          usePortrait
          startZIndex={10}
          autoSize
          maxShadowOpacity={0.48}
          showCover
          mobileScrollSupport
          clickEventForward
          useMouseEvents
          swipeDistance={24}
          showPageCorners
          disableFlipByClick={false}
          onFlip={(event: { data: number }) => {
            setCurrentPage(event.data);
            saveLastReadAt(event.data);
            recordReaderProgress(config.bookId, pages[event.data], event.data, pages.length, cloudBookId);
          }}
        >
          {pages.map(renderPage)}
        </HTMLFlipBook>
      </section>

      <ReaderControls
        bindingDirection={config.bindingDirection}
        current={currentPage}
        total={pages.length}
        onFirst={() => pageFlip()?.turnToPage(0)}
        onContents={() => jumpToId("contents-1")}
        onPrevious={() => pageFlip()?.flipPrev("top")}
        onNext={() => pageFlip()?.flipNext("top")}
        onJumpToPage={jumpToPrintedPage}
      />
      <ReadingTools
        isBookmarked={hasBookmarkInCurrentSpread}
        stickyNotes={stickyNotes}
        resumePosition={resumePosition}
        autoFlipEnabled={autoFlipEnabled}
        autoFlipSeconds={autoFlipSeconds}
        autoFlipLoop={autoFlipLoop}
        autoFlipStartMode={autoFlipStartMode}
        onToggleBookmark={toggleStickyNote}
        onJumpToStickyNote={jumpToStickyNote}
        onRemoveStickyNote={removeStickyNote}
        onContinue={continueReading}
        onToggleAutoFlip={toggleAutoFlip}
        onAutoFlipSecondsChange={setAutoFlipSeconds}
        onAutoFlipLoopChange={setAutoFlipLoop}
        onAutoFlipStartModeChange={setAutoFlipStartMode}
      />
      <ShareTools bookId={config.bookId} cloudBookId={cloudBookId} title={config.title} />
      <p className="reader-help">{helpText}</p>
    </main>
  );
}
