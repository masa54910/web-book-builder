import { Suspense } from "react";

import PurchaseSuccessClient from "./PurchaseSuccessClient";

export const dynamic = "force-dynamic";

export default function PurchaseSuccessPage() {
  return (
    <Suspense fallback={<main className="purchase-page"><section className="purchase-card"><p>お支払いを確認しています…</p></section></main>}>
      <PurchaseSuccessClient />
    </Suspense>
  );
}
