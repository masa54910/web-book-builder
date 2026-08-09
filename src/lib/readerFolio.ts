import type { ReaderPage } from "./types";

/**
 * The printed folio used by BookPage is the logical page index. Hard-cover
 * pages do not receive a folio, while inserted page-break sheets are also
 * intentionally left unnumbered.
 */
export function buildReaderFolioById(pages: ReaderPage[]) {
  return new Map(pages.map((page, index) => [page.id, index] as const));
}

export function readerPageNumberLabel(page: ReaderPage, logicalFolioById: ReadonlyMap<string, number>) {
  if (page.kind === "cover") return "表紙";
  if (page.kind === "backCover") return "裏表紙";
  if (page.kind === "pageBreak") return "改ページ";
  const folio = logicalFolioById.get(page.id);
  return folio === undefined ? "" : String(folio).padStart(2, "0");
}
