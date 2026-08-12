"use client";

import { useState, type SyntheticEvent } from "react";

import { youtubeEmbedUrl, youtubeThumbnailUrl } from "@/lib/youtube";

function stopPageFlip(event: SyntheticEvent) {
  event.stopPropagation();
}

export default function YouTubePage({ videoId, inline = false, displaySize = "full" }: { videoId: string; inline?: boolean; displaySize?: "small" | "medium" | "large" | "full" }) {
  const [active, setActive] = useState(false);

  return (
    <article className={`youtube-page ${inline ? "is-inline" : "is-full-page"} media-display-size-${displaySize}`} aria-label="YouTube動画">
      <div
        className="youtube-player-shell"
        onPointerDown={stopPageFlip}
        onMouseDown={stopPageFlip}
        onTouchStart={stopPageFlip}
        onClick={stopPageFlip}
      >
        {active ? (
          <iframe
            className="youtube-player-frame"
            src={`${youtubeEmbedUrl(videoId)}&autoplay=1`}
            title="YouTube動画プレーヤー"
            loading="lazy"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
          />
        ) : (
          <button
            className="youtube-player-poster"
            type="button"
            aria-label="YouTube動画を再生"
            onClick={(event) => {
              event.stopPropagation();
              setActive(true);
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={youtubeThumbnailUrl(videoId)} alt="" loading="lazy" decoding="async" />
            <span className="youtube-player-play" aria-hidden="true">▶</span>
            <span className="youtube-player-label">YouTube動画</span>
          </button>
        )}
      </div>
    </article>
  );
}
