import { NextResponse } from "next/server";

function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function GET(_: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const safeSlug = escapeXml(decodeURIComponent(slug || "web-book"));
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630" role="img" aria-label="WebBookMaker OGP">
  <defs>
    <linearGradient id="paper" x1="0" x2="1" y1="0" y2="1">
      <stop offset="0" stop-color="#fff8ec"/>
      <stop offset="1" stop-color="#efd9b9"/>
    </linearGradient>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="18" stdDeviation="22" flood-color="#5b3920" flood-opacity="0.18"/>
    </filter>
  </defs>
  <rect width="1200" height="630" fill="#fbf1e2"/>
  <circle cx="1010" cy="110" r="190" fill="#f1c987" opacity="0.28"/>
  <rect x="142" y="90" width="916" height="450" rx="34" fill="url(#paper)" filter="url(#shadow)"/>
  <path d="M600 105v420" stroke="#d7bd98" stroke-width="4"/>
  <path d="M585 105c-22 78-22 342 0 420" stroke="#bea17b" stroke-width="12" opacity="0.35"/>
  <path d="M615 105c22 78 22 342 0 420" stroke="#bea17b" stroke-width="12" opacity="0.22"/>
  <text x="210" y="190" fill="#9c641f" font-family="Georgia,serif" font-size="28" letter-spacing="6">WebBookMaker</text>
  <text x="210" y="272" fill="#332319" font-family="'Yu Mincho','Hiragino Mincho ProN',serif" font-size="56" font-weight="700">Webで読める一冊</text>
  <text x="210" y="336" fill="#5c4633" font-family="'Yu Gothic',sans-serif" font-size="28">/${safeSlug}</text>
  <text x="690" y="210" fill="#332319" font-family="'Yu Mincho','Hiragino Mincho ProN',serif" font-size="40">ページをめくる</text>
  <text x="690" y="268" fill="#332319" font-family="'Yu Mincho','Hiragino Mincho ProN',serif" font-size="40">Web作品体験</text>
  <text x="690" y="368" fill="#7a5432" font-family="'Yu Gothic',sans-serif" font-size="24">Created with WebBookMaker</text>
  <circle cx="940" cy="430" r="54" fill="#fff"/>
  <text x="910" y="448" font-size="42">🐾</text>
</svg>`;

  return new NextResponse(svg, {
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
