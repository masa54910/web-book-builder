import BookReaderShell from "@/components/BookReaderShell";
import PublicBookPage from "@/components/PublicBookPage";
import { loadSampleBookProject } from "@/lib/sampleBook";
import { SAMPLE_BOOK_SLUG } from "@/lib/sampleBookConstants";

export default async function PublicBookRoute({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const decodedSlug = decodeURIComponent(slug || "");

  if (decodedSlug === SAMPLE_BOOK_SLUG) {
    const sample = loadSampleBookProject();
    return (
      <BookReaderShell
        config={sample.config}
        chapters={sample.chapters}
        images={sample.images}
      />
    );
  }

  return <PublicBookPage />;
}
