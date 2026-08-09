import type { Metadata } from "next";

import UseCasesPage from "@/components/ver2/UseCasesPage";

export const metadata: Metadata = {
  title: "WebBookMakerのおすすめポイント・活用例 | WebBookMaker",
  description: "文章を貼るだけでWebブックに。教材、レシピ、ブログまとめ、研究レポート、作品集など、WebBookMakerの活用方法を紹介します。",
  alternates: { canonical: "https://webbookmaker.vercel.app/use-cases" },
  openGraph: {
    title: "WebBookMakerのおすすめポイント・活用例",
    description: "文章を貼るだけでWebブックに。WebBookMakerの強みと活用イメージを紹介します。",
    url: "https://webbookmaker.vercel.app/use-cases",
    type: "website",
  },
};

export default function UseCasesRoute() {
  return <UseCasesPage />;
}
