export type ShareTemplatePlatform = "note" | "facebook" | "line";

export type ShareTemplateInput = {
  platform: ShareTemplatePlatform;
  title: string;
  description?: string;
  url: string;
};

function clean(value: string | undefined) {
  return value?.trim() || "";
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
