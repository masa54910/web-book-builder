"use client";
import { forwardRef, useEffect, useRef, type ReactNode } from "react";
import { evaluateLayoutGeometry } from "@/lib/layoutGeometry";

const BookPage = forwardRef<
  HTMLDivElement,
  {
    children: ReactNode;
    folio?: number;
    hard?: boolean;
    label: string;
    bookmarked?: boolean;
    fullPattern?: string;
  }
>(function BookPage({ children, folio, hard = false, label, bookmarked = false, fullPattern }, ref) {
  const localRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const page = localRef.current;
    if (!page || !fullPattern || fullPattern === "cover") return;
    let frame = 0;
    let disposed = false;
    const measure = () => {
      if (disposed) return;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const surface = page.querySelector<HTMLElement>(".text-page, .columns-reader-grid, .image-page-content");
        if (!surface) return;
        const result = evaluateLayoutGeometry({ width: surface.clientWidth, height: surface.clientHeight, scrollWidth: surface.scrollWidth, scrollHeight: surface.scrollHeight });
        if (result.measured) surface.dataset.layoutOverflow = result.overflow ? "scroll" : "none";
      });
    };
    const observer = new ResizeObserver(measure);
    observer.observe(page);
    page.querySelectorAll("img").forEach((image) => image.addEventListener("load", measure));
    void document.fonts.ready.then(measure);
    measure();
    return () => {
      disposed = true;
      cancelAnimationFrame(frame); observer.disconnect();
      page.querySelectorAll("img").forEach((image) => image.removeEventListener("load", measure));
    };
  }, [fullPattern, children]);
  return (
    <div
      ref={(node) => { localRef.current = node; if (typeof ref === "function") ref(node); else if (ref) ref.current = node; }}
      className="book-page"
      data-density={hard ? "hard" : "soft"}
      data-full-pattern={fullPattern}
      aria-label={label}
    >
      <div className="book-page-inner">{children}</div>
      {bookmarked ? (
        <span className="bookmark-tab" role="img" aria-label="このページには付箋があります">
          <span aria-hidden="true">付箋</span>
        </span>
      ) : null}
      {folio ? <span className="page-folio">{String(folio).padStart(2, "0")}</span> : null}
    </div>
  );
});

export default BookPage;
