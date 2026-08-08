import type { Metadata } from "next";
import { notFound } from "next/navigation";

import AuthorPage from "@/components/AuthorPage";
import { authorPageUrl, normalizeAuthorPageHandle } from "@/lib/authorPage";
import { loadPublicAuthorPage } from "@/lib/authorPageRepository.server";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ handle: string }> }): Promise<Metadata> {
  const { handle: rawHandle } = await params;
  const handle = normalizeAuthorPageHandle(rawHandle);
  if (!handle) return { title: "ページが見つかりません | WebBookMaker" };
  const data = await loadPublicAuthorPage(handle);
  const displayName = data?.profile.displayName || (handle ? `@${handle}` : "作者ページ");
  const description = data?.profile.bio || `${displayName}のWebBookMaker公開作品一覧`;
  const url = authorPageUrl(handle);
  const ogImage = data?.profile.avatarUrl || new URL("/sample-images/hoshifuru-cover-night.png", url).toString();

  return {
    title: `${displayName} | WebBookMaker`,
    description,
    alternates: { canonical: url },
    openGraph: {
      title: `${displayName} | WebBookMaker`,
      description,
      type: "profile",
      url,
      siteName: "WebBookMaker",
      images: [{ url: ogImage, alt: data?.profile.avatarUrl ? `${displayName}のプロフィール画像` : "WebBookMaker" }],
    },
    twitter: {
      card: "summary_large_image",
      title: `${displayName} | WebBookMaker`,
      description,
      images: [ogImage],
    },
  };
}

export default async function AtAuthorRoute({ params }: { params: Promise<{ handle: string }> }) {
  const { handle: rawHandle } = await params;
  const handle = normalizeAuthorPageHandle(rawHandle);
  if (!handle) notFound();
  const data = await loadPublicAuthorPage(handle);
  if (!data) notFound();
  return <AuthorPage initialData={data} />;
}
