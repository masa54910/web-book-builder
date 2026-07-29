export default function ChapterTitlePage({
  title,
  order,
  series,
}: {
  title: string;
  order: number;
  series: string;
}) {
  return (
    <div className="chapter-title-page">
      <div className="chapter-mark">{String(order).padStart(2, "0")}</div>
      <p className="editorial-label">Chapter</p>
      <h2>{title}</h2>
      <p className="chapter-series">{series}</p>
      <div className="chart-rule" aria-hidden="true" />
    </div>
  );
}
