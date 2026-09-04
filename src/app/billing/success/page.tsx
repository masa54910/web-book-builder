import { Suspense } from "react";
import BillingSuccessClient from "./BillingSuccessClient";

export const dynamic = "force-dynamic";

export default function BillingSuccessPage() {
  return <Suspense fallback={<main className="purchase-page"><section className="purchase-card"><p>お支払いを確認しています…</p></section></main>}><BillingSuccessClient /></Suspense>;
}
