import { forwardRef, type ReactNode } from "react";

const BookPage = forwardRef<
  HTMLDivElement,
  {
    children: ReactNode;
    folio?: number;
    hard?: boolean;
    label: string;
    bookmarked?: boolean;
  }
>(function BookPage({ children, folio, hard = false, label, bookmarked = false }, ref) {
  return (
    <div
      ref={ref}
      className="book-page"
      data-density={hard ? "hard" : "soft"}
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
