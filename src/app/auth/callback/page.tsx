import { Suspense } from "react";
import AuthCallbackPage from "@/components/AuthCallbackPage";

export default function AuthCallbackRoute() {
  return (
    <Suspense fallback={<div className="reader-loading">認証情報を確認しています…</div>}>
      <AuthCallbackPage />
    </Suspense>
  );
}
