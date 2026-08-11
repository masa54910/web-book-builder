import type { Metadata } from "next";

import PricingShowcasePage from "@/components/ver2/PricingShowcasePage";

export const metadata: Metadata = {
  title: "料金プラン | WebBookMaker",
  description: "無料で作って試せるWebBookMakerの料金プラン。1作品を公開する出版プランと、公開後も作品を育てられる運用プランをご案内します。",
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
