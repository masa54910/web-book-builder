import type { Metadata } from "next";

import BrandStoryPage from "@/components/ver2/BrandStoryPage";

export const metadata: Metadata = {
  title: "なぜ、このWebBookMakerを作ったか。｜WebBookMaker",
  description:
    "書いた文章が埋もれていく体験から、届け方を変えるWebBookMakerを作るまで。運営者自身が、サービスに込めた思いを綴ります。",
  alternates: { canonical: "https://webbookmaker.vercel.app/brand-story" },
  openGraph: {
    title: "なぜ、このWebBookMakerを作ったか。｜WebBookMaker",
    description:
      "読まれなかった文章に、価値がなかったとは限らない。WebBookMakerが生まれた理由を、運営者自身の体験からお伝えします。",
    url: "https://webbookmaker.vercel.app/brand-story",
    type: "article",
  },
};

export default function BrandStoryRoute() {
  return <BrandStoryPage />;
}
