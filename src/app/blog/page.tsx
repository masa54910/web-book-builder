import Link from "next/link";
import AppHeader from "@/components/AppHeader";
import HomeBackLink from "@/components/HomeBackLink";

export const metadata = {
  title: "Blog | WebBookMaker",
  description: "WebBookMaker編集部からのお知らせとWeb出版ノート。",
};

const posts = [
  {
    title: "WebBookMakerは、電子書籍作成ツールではありません",
    excerpt:
      "書き終わった文章を、一冊の作品として読者へ届ける。Web出版サービスとしてのWebBookMakerの考え方。",
    tag: "Concept",
  },
  {
    title: "公開後に作品を育てるためのPromotion Center",
    excerpt: "X、note、共有URL。保存して終わりにしないための導線をベータ版から用意しています。",
    tag: "Promotion",
  },
  {
    title: "ミオとブッキーについて",
    excerpt: "WebBookMaker編集部のアシスタント、ミオと編集部猫ブッキーが作品づくりに寄り添います。",
    tag: "Brand",
  },
];

export default function BlogPage() {
  return (
    <main className="dashboard-page public-info-page">
      <AppHeader />
      <section className="dashboard-heading">
        <div>
          <p className="maker-kicker">WebBookMaker Blog</p>
          <HomeBackLink />
          <h1>編集部ノート</h1>
          <p>Webで作品を届けるための考え方、更新情報、使い方のヒントをまとめます。</p>
        </div>
        <Link className="maker-primary-link" href="/books/new">
          新しい作品を作る
        </Link>
      </section>

      <section className="blog-card-grid">
        {posts.map((post) => (
          <article className="maker-card blog-card" key={post.title}>
            <p className="maker-kicker">{post.tag}</p>
            <h2>{post.title}</h2>
            <p>{post.excerpt}</p>
          </article>
        ))}
      </section>
    </main>
  );
}
