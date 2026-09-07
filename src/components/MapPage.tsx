"use client";
import { useEffect, useRef, useState } from "react";
import { useUiLocale } from "@/components/UiLocaleProvider";
import { uiT } from "@/lib/localization";
import { normalizeMapAlignment, type MapAlignment } from "@/lib/mapLayout";
import { createPortal } from "react-dom";

export default function MapPage({ sourceUrl, embedUrl, displaySize = "medium", alignment }: { sourceUrl: string; embedUrl: string; displaySize?: "small" | "medium" | "large" | "full"; alignment?: MapAlignment }) {
  const { locale } = useUiLocale(); const [open, setOpen] = useState(false); const [failed, setFailed] = useState(false); const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => { if (!open) return; const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); }; document.addEventListener("keydown", onKey); closeRef.current?.focus(); return () => document.removeEventListener("keydown", onKey); }, [open]);
  const frame = (className: string) => failed ? <div className="map-fallback" role="status">{uiT(locale, "map.fallback")} <a href={sourceUrl} target="_blank" rel="noopener noreferrer">{uiT(locale, "map.openInGoogleMaps")}</a></div> : <iframe className={className} src={embedUrl} title={uiT(locale, "map.title")} loading="lazy" referrerPolicy="no-referrer-when-downgrade" allowFullScreen onError={() => setFailed(true)} />;
  return <>
    <article className={`map-page media-display-size-${displaySize} map-align-${normalizeMapAlignment(alignment)}`} aria-label={uiT(locale, "map.title")} onPointerDown={(event) => event.stopPropagation()} onTouchStart={(event) => event.stopPropagation()} onMouseDown={(event) => event.stopPropagation()}><div className="map-frame-shell">{frame("map-frame")}</div><div className="map-controls"><button type="button" className="map-expand-button" onClick={() => setOpen(true)}>{uiT(locale, "map.expand")}</button><a className="map-open-link" href={sourceUrl} target="_blank" rel="noopener noreferrer">{uiT(locale, "map.openInGoogleMaps")}</a></div></article>
    {open ? createPortal(<div className="map-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.currentTarget === event.target) setOpen(false); }}><section className="map-modal" role="dialog" aria-modal="true" aria-labelledby="map-modal-title"><div className="map-modal-header"><h2 id="map-modal-title">{uiT(locale, "map.title")}</h2><button ref={closeRef} type="button" className="map-modal-close" onClick={() => setOpen(false)} aria-label={uiT(locale, "map.close")}>×</button></div>{frame("map-modal-frame")}</section></div>, document.body) : null}
  </>;
}
