import { Suspense } from "react";

import DynamicReaderPage from "@/components/DynamicReaderPage";

export default function ReaderPage() {
  return (
    <Suspense fallback={<div className="reader-loading">作成中のWeb書籍を読み込んでいます…</div>}>
      <DynamicReaderPage />
    </Suspense>
  );
}
