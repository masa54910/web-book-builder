export type ShareTemplatePlatform = "note" | "facebook" | "line";

export const NOTE_NEW_POST_URL = "https://note.com/new";

export type ShareTemplateInput = {
  platform: ShareTemplatePlatform;
  title: string;
  description?: string;
  url: string;
};

export type XShareTemplateInput = Omit<ShareTemplateInput, "platform"> & {
  hashtags?: string[];
};

function clean(value: string | undefined) {
  return value?.trim() || "";
}

function cleanHashtags(hashtags: string[] | undefined) {
  return (hashtags || [])
    .map((tag) => tag.trim().replace(/^#+/, ""))
    .filter(Boolean)
    .map((tag) => `#${tag}`);
}

/**
 * Build the canonical X post text used by both the reader and Promotion Center.
 * Keep the title and public URL while omitting the old publication boilerplate.
 */
export function buildXShareTemplate({ title, description, url, hashtags }: XShareTemplateInput) {
  const safeTitle = clean(title) || "WebBookMaker";
  const safeDescription = clean(description);
  const safeUrl = clean(url);
  const lines = [`【${safeTitle}】`];

  if (safeDescription) lines.push("", safeDescription);

  lines.push("", "WebBookMakerで読む");
  if (safeUrl) lines.push(safeUrl);

  const hashtagLines = cleanHashtags(hashtags);
  if (hashtagLines.length) lines.push("", hashtagLines.join(" "));

  return lines.join("\n");
}

export function buildXShareUrl(input: XShareTemplateInput) {
  return `https://twitter.com/intent/tweet?text=${encodeURIComponent(buildXShareTemplate(input))}`;
}

/**
 * Build the plain-text template copied before opening an external posting
 * screen. External compose forms do not guarantee arbitrary body parameters.
 */
export function buildShareTemplate({ platform, title, description, url }: ShareTemplateInput) {
  const safeTitle = clean(title) || "WebBookMaker";
  const safeDescription = clean(description);
  const safeUrl = clean(url);
  const lines = [`【${safeTitle}】`];

  if (safeDescription) {
    lines.push("", safeDescription);
  }

  lines.push("", "WebBookMakerで読む");
  if (safeUrl) lines.push(safeUrl);
  if (platform === "note" || platform === "facebook") lines.push("", "#WebBookMaker");

  return lines.join("\n");
}

export function buildLineShareTemplate(input: Omit<ShareTemplateInput, "platform">) {
  return buildShareTemplate({ ...input, platform: "line" });
}

export function buildLineShareUrl(input: Omit<ShareTemplateInput, "platform">) {
  return `https://line.me/R/share?text=${encodeURIComponent(buildLineShareTemplate(input))}`;
}

export function buildFacebookShareUrl(input: Omit<ShareTemplateInput, "platform">) {
  const url = clean(input.url);
  const quote = buildShareTemplate({ ...input, platform: "facebook" });
  const query = new URLSearchParams({ u: url, quote });
  return `https://www.facebook.com/sharer/sharer.php?${query.toString()}`;
}
