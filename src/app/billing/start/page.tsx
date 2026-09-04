import { Suspense } from "react";
import BillingStartClient from "./BillingStartClient";
export default function BillingStartPage() { return <Suspense fallback={<main className="auth-page"><section className="auth-card"><p>読み込み中…</p></section></main>}><BillingStartClient /></Suspense>; }
