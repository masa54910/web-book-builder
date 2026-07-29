import type { Metadata } from "next";
import AppProviders from "@/components/AppProviders";
import "./globals.css";

const isPreviewEnvironment = process.env.NEXT_PUBLIC_APP_ENV === "preview";

export const metadata: Metadata = {
  title: "WebBookMaker | あなたの文章を、読まれるWeb書籍に。",
  description:
    "書き終わった文章を貼り付けるだけ。表紙・目次・ページめくり付きのWeb書籍を自動生成し、URLひとつで公開できます。",
  openGraph: {
    title: "WebBookMaker",
    description:
      "書いた文章を、読者へ届く作品へ変えるWeb出版サービス。",
    type: "website",
  },
  robots: isPreviewEnvironment
    ? {
        index: false,
        follow: false,
        googleBot: {
          index: false,
          follow: false,
        },
      }
    : undefined,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
