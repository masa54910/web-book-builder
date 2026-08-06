import { NOTE_NEW_POST_URL } from "@/lib/shareTemplates";

export const READER_NOTE_NEW_POST_URL = NOTE_NEW_POST_URL;

export type ReaderShareTemplateInput = {
  title?: string | null;
  description?: string | null;
  url: string;
};

function clean(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

/**
 * Reader shares use reader-facing copy rather than the author/admin
 * promotion template. Keeping this formatter pure ensures every channel
 * receives the same current public-book details.
 */
export function buildReaderShareTemplate({ title, description, url }: ReaderShareTemplateInput) {
  const safeTitle = clean(title);
  const safeDescription = clean(description);
  const safeUrl = clean(url);
  const sections = ["おすすめのWebブック"];

  if (safeTitle) sections.push(`【${safeTitle}】`);
  if (safeDescription) sections.push(safeDescription);
  if (safeUrl) sections.push(`WebBookMakerで読む\n${safeUrl}`);
  sections.push("#WebBookMaker");

  return sections.join("\n\n");
}

export function buildReaderXShareUrl(input: ReaderShareTemplateInput) {
  return `https://twitter.com/intent/tweet?text=${encodeURIComponent(buildReaderShareTemplate(input))}`;
}

export function buildReaderFacebookShareUrl(input: ReaderShareTemplateInput) {
  const query = new URLSearchParams({
    u: clean(input.url),
    quote: buildReaderShareTemplate(input),
  });
  return `https://www.facebook.com/sharer/sharer.php?${query.toString()}`;
}

export function buildReaderLineShareUrl(input: ReaderShareTemplateInput) {
  return `https://line.me/R/share?text=${encodeURIComponent(buildReaderShareTemplate(input))}`;
}

export function buildReaderLineWebShareUrl(input: ReaderShareTemplateInput) {
  const query = new URLSearchParams({
    url: clean(input.url),
    text: buildReaderShareTemplate(input),
  });
  return `https://social-plugins.line.me/lineit/share?${query.toString()}`;
}
