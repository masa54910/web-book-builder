import Link from "next/link";

type BrandLogoProps = {
  href?: string;
  subtitle?: string;
  className?: string;
};

export default function BrandLogo({
  href = "/",
  subtitle = "あなたの文章を世界に1冊のWebブックに。",
  className = "",
}: BrandLogoProps) {
  return (
    <Link href={href} className={`inline-flex items-center gap-3 text-slate-900 ${className}`.trim()} aria-label="WebBookMaker ホーム">
      <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-100 via-white to-emerald-50 shadow-sm ring-1 ring-emerald-100">
        <svg viewBox="0 0 48 48" className="h-8 w-8" aria-hidden="true">
          <defs>
            <linearGradient id="wbmFrame" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#e59d2f" />
              <stop offset="100%" stopColor="#0f6f5d" />
            </linearGradient>
            <linearGradient id="wbmPaper" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#fffdf6" />
              <stop offset="100%" stopColor="#f3ebdc" />
            </linearGradient>
          </defs>
          <rect x="5" y="7" width="38" height="28" rx="4" fill="url(#wbmPaper)" stroke="url(#wbmFrame)" strokeWidth="2" />
          <path d="M24 11v20" stroke="#bba57e" strokeWidth="1.8" />
          <path d="M10 14.5c4.2-1.8 8.3-1.8 12.8 0v16.5c-4.5-1.8-8.6-1.8-12.8 0z" fill="#fff" stroke="#d8cab1" strokeWidth="1.2" />
          <path d="M25.2 14.5c4.5-1.8 8.6-1.8 12.8 0v16.5c-4.2-1.8-8.3-1.8-12.8 0z" fill="#fff" stroke="#d8cab1" strokeWidth="1.2" />
          <rect x="14.4" y="35.5" width="19.2" height="3.3" rx="1.6" fill="#0f6f5d" opacity="0.88" />
        </svg>
      </span>
      <span className="min-w-0">
        <strong className="block truncate text-xl font-black tracking-tight">WebBookMaker</strong>
        <small className="block truncate text-[11px] font-bold text-emerald-800/75">{subtitle}</small>
      </span>
    </Link>
  );
}
