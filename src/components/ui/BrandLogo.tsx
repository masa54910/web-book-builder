import Link from "next/link";
import { useId } from "react";

type BrandLogoProps = {
  href: string;
  ariaLabel?: string;
  className?: string;
  iconClassName?: string;
  svgClassName?: string;
  copyClassName?: string;
  wordClassName?: string;
  wordMakerClassName?: string;
  taglineClassName?: string;
  tagline?: string;
  showTagline?: boolean;
};

export default function BrandLogo({
  href,
  ariaLabel = "WebBookMaker ホーム",
  className,
  iconClassName,
  svgClassName,
  copyClassName,
  wordClassName,
  wordMakerClassName,
  taglineClassName,
  tagline = "あなたの文章を世界に1冊のWebブックに。",
  showTagline = true,
}: BrandLogoProps) {
  const uid = useId().replace(/:/g, "");
  const frameId = `wbmTabletFrame-${uid}`;
  const paperId = `wbmBookPaper-${uid}`;

  return (
    <Link href={href} className={className} aria-label={ariaLabel}>
      <span className={iconClassName}>
        <svg className={svgClassName} viewBox="0 0 96 82" aria-hidden="true">
          <defs>
            <linearGradient id={frameId} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#183f36" />
              <stop offset="1" stopColor="#0f6f5d" />
            </linearGradient>
            <linearGradient id={paperId} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#fffdf7" />
              <stop offset="1" stopColor="#f5ead6" />
            </linearGradient>
          </defs>
          <ellipse cx="45" cy="75" rx="37" ry="5" fill="#d9c7a8" opacity=".28" />
          <path d="M66 15 87 72H67Z" fill="#17483c" opacity=".95" />
          <g transform="rotate(-4 45 39)">
            <rect x="9" y="8" width="66" height="61" rx="9" fill={`url(#${frameId})`} />
            <rect x="15" y="14" width="54" height="49" rx="5" fill="#f9f4e9" />
            <circle cx="42" cy="11" r="1.3" fill="#8cb0a4" />
          </g>
          <g transform="translate(18 20)">
            <path d="M2 5c10-2 18 0 25 6v35c-7-5-15-7-25-5Z" fill={`url(#${paperId})`} stroke="#ead9bd" strokeWidth="1.4" />
            <path d="M52 5c-10-2-18 0-25 6v35c7-5 15-7 25-5Z" fill={`url(#${paperId})`} stroke="#ead9bd" strokeWidth="1.4" />
            <path d="M27 11v35" stroke="#dfcba8" strokeWidth="1.4" />
            <path d="M10 17h11M10 23h12M10 29h10M34 17h10M34 23h12M34 29h9" stroke="#d9c6a5" strokeWidth="1.7" strokeLinecap="round" />
            <path d="M13 4h9v15l-4.5-3-4.5 3Z" fill="#ef8b3d" />
          </g>
          <g fill="#ef8b3d">
            <path d="M6 23c3 0 5-2 5-5 0 3 2 5 5 5-3 0-5 2-5 5 0-3-2-5-5-5Z" />
          </g>
          <g fill="#0f6f5d">
            <path d="M18 9c2.5 0 4-1.7 4-4 0 2.3 1.5 4 4 4-2.5 0-4 1.7-4 4 0-2.3-1.5-4-4-4Z" />
          </g>
          <circle cx="5" cy="38" r="2.3" fill="#d8b06d" />
          <path d="M5 53c-7 5-7 12 0 16" fill="none" stroke="#dfbf86" strokeWidth="2.2" strokeLinecap="round" />
        </svg>
      </span>
      <span className={copyClassName}>
        <strong className={wordClassName}>
          <span>WebBook</span>
          <em className={wordMakerClassName}>Maker</em>
        </strong>
        {showTagline ? <small className={taglineClassName}>{tagline}</small> : null}
      </span>
    </Link>
  );
}