import type { Metadata } from "next";

import PricingShowcasePage from "@/components/ver2/PricingShowcasePage";

export const metadata: Metadata = {
  title: "料金プラン | WebBookMaker",
  description: "無料で作って試せるWebBookMakerの料金プラン。1冊分の公開枠を使う出版・運用スタンダードと、10冊分を使う運用プラスをご案内します。",
  alternates: { canonical: "https://webbookmaker.vercel.app/pricing" },
  openGraph: {
    title: "料金プラン | WebBookMaker",
    description: "無料で作って試せるWebBookMakerの料金プラン。",
    url: "https://webbookmaker.vercel.app/pricing",
    type: "website",
  },
};

export default function PricingPage() {
  return <PricingShowcasePage />;
}
