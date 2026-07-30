import AppHeader from "@/components/AppHeader";

export const metadata = {
  title: "Help | WebBookMaker",
  description: "WebBookMakerの使い方とベータ版の注意事項。",
};

export default function HelpPage() {
  return (
    <main className="dashboard-page public-info-page">
      <AppHeader />
      <section className="dashboard-heading">
        <div>
          <p className="maker-kicker">Help</p>
          <h1>WebBookMakerの使い方</h1>
          <p>文章を貼り付け、表紙とテーマを選び、Web作品として公開するまでの基本ガイドです。</p>
        </div>
      </section>

      <section className="maker-card help-grid">
        <article>
          <h2>1. 原稿をまとめる</h2>
          <p>本文欄に文章を貼り付けます。Markdown風の「# 章タイトル」を使うと、自動で章と目次に変換されます。</p>
        </article>
        <article>
          <h2>2. 表紙とテーマを選ぶ</h2>
          <p>作品ごとにテーマ、背景、フォント、余白、ページ幅を保存できます。公開後に変更してもURLは変わりません。</p>
        </article>
        <article>
          <h2>3. 公開して広める</h2>
          <p>公開後はPromotion CenterからX投稿文、note紹介文、動画プレビュー、共有URLを作成できます。</p>
        </article>
        <article>
          <h2>ベータ版の注意</h2>
          <p>重要な原稿は必ず手元にも保存してください。決済・販売・AI生成は現在の対象外です。</p>
        </article>
      </section>
    </main>
  );
}
