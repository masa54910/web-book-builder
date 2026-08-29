import type { Metadata } from "next";

import AboutWebBookMakerPage from "@/components/ver2/AboutWebBookMakerPage";

export const metadata: Metadata = {
  title: "WebBookMakerって何？｜文章をWebブックにして公開",
  description:
    "WebBookMakerは、書いた文章をページをめくって読めるWebブックに変えて、URLで公開できるサービスです。アプリ不要・読者登録不要で、公開後の編集やAnalytics、販売にも対応します。",
  alternates: { canonical: "https://webbookmaker.vercel.app/about" },
  openGraph: {
    title: "WebBookMakerって何？｜文章をWebブックにして公開",
    description:
      "書いた文章を、ページをめくって読めるWebブックに。WebBookMakerの仕組みとできることを紹介します。",
    url: "https://webbookmaker.vercel.app/about",
    type: "article",
  },
};

export default function AboutRoute() {
  return <AboutWebBookMakerPage />;
}
