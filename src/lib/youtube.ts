const YOUTUBE_VIDEO_ID_PATTERN = /^[A-Za-z0-9_-]{11}$/;

export type ParsedYouTubeUrl = {
  videoId: string;
  canonicalUrl: string;
};

export function isValidYouTubeVideoId(value: string) {
  return YOUTUBE_VIDEO_ID_PATTERN.test(value);
}

export function parseYouTubeUrl(value: string): ParsedYouTubeUrl | null {
  const candidate = value.trim();
  if (!candidate || /[<>"'`]/.test(candidate)) return null;

  let url: URL;
  try {
    url = new URL(/^https?:\/\//i.test(candidate) ? candidate : `https://${candidate}`);
  } catch {
    return null;
  }

  if (url.protocol !== "https:" && url.protocol !== "http:") return null;
  const hostname = url.hostname.toLowerCase().replace(/^www\./, "");
  let videoId = "";

  if (hostname === "youtu.be") {
    videoId = url.pathname.split("/").filter(Boolean)[0] || "";
  } else if (hostname === "youtube.com" || hostname === "m.youtube.com") {
    const parts = url.pathname.split("/").filter(Boolean);
    if (url.pathname === "/watch") videoId = url.searchParams.get("v") || "";
    else if (["shorts", "embed", "live"].includes(parts[0] || "")) videoId = parts[1] || "";
  }

  if (!isValidYouTubeVideoId(videoId)) return null;
  return {
    videoId,
    canonicalUrl: `https://www.youtube.com/watch?v=${videoId}`,
  };
}

export function youtubeThumbnailUrl(videoId: string) {
  return `https://i.ytimg.com/vi/${encodeURIComponent(videoId)}/hqdefault.jpg`;
}

export function youtubeEmbedUrl(videoId: string) {
  return `https://www.youtube-nocookie.com/embed/${encodeURIComponent(videoId)}?rel=0`;
}
