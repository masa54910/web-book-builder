export default function ChapterTitlePage({
  title,
  order,
  series,
  showTitle = true,
}: {
  title: string;
  order: number;
  series: string;
  showTitle?: boolean;
}) {
  return (
    <div className="chapter-title-page">
      <div className="chapter-mark">{String(order).padStart(2, "0")}</div>
      <p className="editorial-label">Chapter</p>
      {showTitle ? <h2>{title}</h2> : null}
      {series ? <p className="chapter-series">{series}</p> : null}
      <div className="chart-rule" aria-hidden="true" />
    </div>
  );
}
