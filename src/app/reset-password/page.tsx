import { Suspense } from "react";

import ResetPasswordPage from "@/components/ResetPasswordPage";

export default function ResetPasswordRoute() {
  return (
    <Suspense fallback={<div className="reader-loading">認証情報を確認しています…</div>}>
      <ResetPasswordPage />
    </Suspense>
  );
}
