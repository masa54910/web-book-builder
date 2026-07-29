import type { NovelChapter } from "@/lib/types";

export default function ContentsPage({
  chapters,
  startIndex,
  part,
  totalParts,
  onJump,
}: {
  chapters: NovelChapter[];
  startIndex: number;
  part: number;
  totalParts: number;
  onJump: (slug: string) => void;
}) {
  return (
    <div className="contents-page">
      <p className="editorial-label">Complete Edition · {part}/{totalParts}</p>
      <h2>CONTENTS</h2>
      <div className="contents-list">
        {chapters.map((chapter, index) => (
          <button
            key={chapter.slug}
            type="button"
            className="contents-link"
            onPointerDown={(event) => event.stopPropagation()}
            onMouseDown={(event) => event.stopPropagation()}
            onTouchStart={(event) => event.stopPropagation()}
            onClick={(event) => {
              event.stopPropagation();
              onJump(chapter.slug);
            }}
          >
            <span className="contents-index">{String(startIndex + index + 1).padStart(2, "0")}</span>
            <span className="contents-title">{chapter.title}</span>
            <span className="contents-arrow" aria-hidden="true">←</span>
          </button>
        ))}
      </div>
    </div>
  );
}
