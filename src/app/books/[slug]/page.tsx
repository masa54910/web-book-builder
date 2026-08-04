import BookReaderShell from "@/components/BookReaderShell";
import DemoTopActions from "@/components/demo/DemoTopActions";
import PublicBookPage from "@/components/PublicBookPage";
import { publicBookUrl } from "@/lib/promotion";
import { loadSampleBookProject } from "@/lib/sampleBook";
import { SAMPLE_BOOK_SLUG } from "@/lib/sampleBookConstants";

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
          shareUrl={publicBookUrl(decodedSlug)}
        />
      </div>
    );
  }

  return <PublicBookPage />;
}
