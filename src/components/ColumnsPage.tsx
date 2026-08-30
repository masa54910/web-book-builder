"use client";

import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import type { ReaderColumnChild } from "@/lib/types";
import TextPage from "./TextPage";
import YouTubePage from "./YouTubePage";

function ratioColumns(ratio: "50-50" | "40-60" | "60-40") {
  if (ratio === "40-60") return "2fr 3fr";
  if (ratio === "60-40") return "3fr 2fr";
  return "1fr 1fr";
}

function ColumnChild({ child }: { child: ReaderColumnChild }) {
  if (child.kind === "text") {
    return (
      <div className="columns-reader-child columns-reader-child-text">
        <TextPage
          chapterTitle=""
          paragraphs={child.paragraphs}
          paragraphRuns={child.paragraphRuns}
          showRunningHeader={false}
        />
      </div>
    );
  }
  if (child.kind === "youtube") {
    return (
      <div className={`columns-reader-child columns-reader-child-youtube media-display-size-${child.displaySize || "medium"}`}>
        <YouTubePage videoId={child.videoId} inline displaySize={child.displaySize} />
      </div>
    );
  }
  return (
    <div className={`columns-reader-child columns-reader-child-image media-display-size-${child.displaySize || "medium"}`}>
      {child.src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={child.src} alt={child.alt} loading="lazy" decoding="async" />
      ) : (
        <div className="image-fallback">IMAGE</div>
      )}
      {child.caption.trim() ? <small>{child.caption}</small> : null}
      {child.missing ? <small className="text-inline-image-missing">画像IDが登録されていません。</small> : null}
    </div>
  );
}

export default function ColumnsPage({
  ratio,
  left,
  right,
  columnsBlockId,
}: {
  ratio: "50-50" | "40-60" | "60-40";
  left: ReaderColumnChild[];
  right: ReaderColumnChild[];
  columnsBlockId: string;
}) {
  const leftRef = useRef<HTMLDivElement | null>(null);
  const rightRef = useRef<HTMLDivElement | null>(null);
  const [overflow, setOverflow] = useState(false);

  useEffect(() => {
    const measure = () => {
      const panes = [leftRef.current, rightRef.current].filter(Boolean) as HTMLDivElement[];
      setOverflow(panes.some((pane) => pane.scrollHeight > pane.clientHeight + 2));
    };
    measure();
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(measure);
    if (observer) {
      if (leftRef.current) observer.observe(leftRef.current);
      if (rightRef.current) observer.observe(rightRef.current);
    }
    window.addEventListener("resize", measure);
    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [left.length, right.length]);

  return (
    <article
      className={`columns-reader-page${overflow ? " is-overflowing" : ""}`}
      data-columns-block-id={columnsBlockId}
      data-columns-ratio={ratio}
      style={{ "--columns-grid": ratioColumns(ratio) } as CSSProperties}
    >
      <div className="columns-reader-pane" ref={leftRef} data-columns-side="left">
        {left.map((child) => <ColumnChild key={child.id} child={child} />)}
      </div>
      <div className="columns-reader-divider" aria-hidden="true" />
      <div className="columns-reader-pane" ref={rightRef} data-columns-side="right">
        {right.map((child) => <ColumnChild key={child.id} child={child} />)}
      </div>
      {overflow ? <p className="columns-reader-overflow-warning">2カラムの内容が1ページに収まっていません。内容を減らすか、2カラムを分けてください。</p> : null}
    </article>
  );
}
