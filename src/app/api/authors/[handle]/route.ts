import { NextResponse } from "next/server";

import { loadPublicAuthorPage } from "@/lib/authorPageRepository.server";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  const data = await loadPublicAuthorPage(handle);
  if (!data) return NextResponse.json({ error: "AUTHOR_NOT_FOUND" }, { status: 404 });
  return NextResponse.json(data, {
    headers: {
      "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
    },
  });
}
