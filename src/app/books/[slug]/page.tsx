import type { Metadata } from "next";
import { createClient } from "@supabase/supabase-js";

import BookReaderShell from "@/components/BookReaderShell";
import DemoTopActions from "@/components/demo/DemoTopActions";
import PublicBookPage from "@/components/PublicBookPage";
import { publicBookUrl } from "@/lib/promotion";
import { loadSampleBookProject } from "@/lib/sampleBook";
import { SAMPLE_BOOK_SLUG } from "@/lib/sampleBookConstants";

export const dynamic = "force-dynamic";

type PublicBookMetadataRow = {
  title: string;
  description: string;
  author_name: string;
};

async function loadPublicBookMetadata(slug: string) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) return null;

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  });
  const { data } = await supabase
    .from("books")
    .select("title, description, author_name")
    .eq("slug", slug)
    .eq("status", "published")
    .in("visibility", ["public", "unlisted"])
    .is("deleted_at", null)
    .maybeSingle<PublicBookMetadataRow>();
  return data;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const decodedSlug = decodeURIComponent(slug || "");
  const sample = decodedSlug === SAMPLE_BOOK_SLUG ? loadSampleBookProject() : null;
  const book = sample
    ? { title: sample.config.title, description: sample.config.description, author_name: sample.config.author }
    : await loadPublicBookMetadata(decodedSlug);
  const title = book?.title ? `${book.title} | WebBookMaker` : "WebBookMaker | Webで読める一冊";
  const description =
    book?.description || (book?.author_name ? `${book.author_name} のWebブックを公開しています。` : "ページをめくるように読めるWebブック。");
  const baseUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://webbookmaker.vercel.app").replace(/\/$/, "");
  const publicUrl = `${baseUrl}/books/${encodeURIComponent(decodedSlug)}`;
  const ogImageUrl = `${baseUrl}/api/og/book/${encodeURIComponent(decodedSlug)}`;

  return {
    title,
    description,
    alternates: { canonical: publicUrl },
    openGraph: {
      title,
      description,
      type: "article",
      url: publicUrl,
      siteName: "WebBookMaker",
      images: [{ url: ogImageUrl, width: 1200, height: 630, alt: title }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImageUrl],
    },
  };
}

export default async function PublicBookRoute({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const decodedSlug = decodeURIComponent(slug || "");

  if (decodedSlug === SAMPLE_BOOK_SLUG) {
    const sample = loadSampleBookProject();
    return (
      <div className="sample-reader-wrap">
        <DemoTopActions floating />
        <BookReaderShell
          config={sample.config}
          chapters={sample.chapters}
          images={sample.images}
          displayMode="published"
          shareUrl={publicBookUrl(decodedSlug)}
        />
      </div>
    );
  }

  return <PublicBookPage />;
}
