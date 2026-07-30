"use client";

import Link from "next/link";
import AppHeader from "@/components/AppHeader";
import CharacterAssistant from "@/components/CharacterAssistant";
import { useAuth } from "@/lib/auth/AuthContext";
import { PRICING_PLANS } from "@/lib/productTypes";

export default function LandingPage() {
  const { user, authMode, configurationError } = useAuth();

  return (
    <main className="landing-page">
      <AppHeader />
      <section className="landing-hero warm-hero">
        <div>
          <p className="maker-kicker">WebBookMaker beta</p>
          <h1>あなたの文章を、読まれるWeb書籍に。</h1>
          <p>
            書き終わった文章を貼り付けるだけ。表紙・目次・ページめくり付きのWeb書籍を自動生成し、
            URLひとつで世界へ公開できます。
          </p>
          <blockquote>
            WebBookMakerは「電子書籍作成ツール」ではありません。書いた文章を、読者へ届く作品へ変えるWeb出版サービスです。
          </blockquote>
          <div className="landing-actions">
            <Link className="maker-primary-link" href={user ? "/dashboard" : "/signup"}>
              {user ? "マイライブラリを開く" : "無料で始める"}
            </Link>
            <Link className="maker-secondary-link" href="/sample">
              サンプルWeb書籍を見る
            </Link>
          </div>
          {authMode === "demo" ? (
            <p className="auth-notice compact">
              現在はSupabase未設定のためローカルデモ保存で動作します。本番公開時は環境変数を設定してください。
            </p>
          ) : null}
          {authMode === "blocked" ? (
            <p className="form-error compact">{configurationError}</p>
          ) : null}
          <CharacterAssistant event="welcome" compact />
        </div>
        <aside className="landing-preview-card" aria-label="Web書籍の機能概要">
          <div className="editor-room-illustration" aria-hidden="true">
            <span className="mio-figure">ミオ</span>
            <span className="booky-figure">🐱</span>
          </div>
          <span>WebBookMaker編集部</span>
          <h2>貼る → 本になる → URLで届く</h2>
          <p>ミオと編集部猫ブッキーが、あなたの原稿をWeb作品として届ける準備を手伝います。</p>
        </aside>
      </section>

      <section className="landing-section paste-flow">
        <p className="maker-kicker">How it works</p>
        <h2>文章を貼り付けるだけで、公開まで。</h2>
        <div className="publish-steps">
          {["文章貼り付け", "表紙とテーマ", "Webブック生成", "公開URL", "SNSへ共有"].map((step, index) => (
            <article key={step}>
              <strong>{String(index + 1).padStart(2, "0")}</strong>
              <span>{step}</span>
            </article>
          ))}
        </div>
      </section>

      <section className="landing-section">
        <p className="maker-kicker">Core value</p>
        <h2>まとめる。見せる。育てる。</h2>
        <div className="value-flow">
          <article>
            <strong>01 / Collect</strong>
            <h3>まとめる</h3>
            <p>note記事、ブログ、TXT、Markdown、Word、旅行記、小説、教材、研究資料を一冊の作品へ。</p>
          </article>
          <article>
            <strong>02 / Present</strong>
            <h3>見せる</h3>
            <p>PDFを送らず、SNS・メール・名刺・プロフィールにURLを貼るだけで美しい読書体験を届けます。</p>
          </article>
          <article>
            <strong>03 / Grow</strong>
            <h3>育てる</h3>
            <p>公開後も同じURLで更新。閲覧数、読了率、人気章を見ながら作品を育てられます。</p>
          </article>
        </div>
      </section>

      <section className="landing-section" id="features">
        <p className="maker-kicker">Features</p>
        <h2>β版で最短公開できること</h2>
        <div className="feature-grid">
          <article>
            <h3>原稿から自動生成</h3>
            <p># 見出しを章として解析し、見出しがない原稿は1章の本として扱います。</p>
          </article>
          <article>
            <h3>保存と再編集</h3>
            <p>作品はユーザーごとに分離。未公開の下書き、公開停止、複製、ソフト削除に対応します。</p>
          </article>
          <article>
            <h3>公開URL</h3>
            <p>公開または限定公開にすると、/books/slug 形式の読書URLで表示できます。</p>
          </article>
          <article>
            <h3>作者ページ</h3>
            <p>/authors/handle でプロフィールと公開作品一覧を表示。作品から作者へ、作者から作品へつなげます。</p>
          </article>
        </div>
      </section>

      <section className="landing-section">
        <p className="maker-kicker">Promotion</p>
        <h2>公開したあと、作品を広める。</h2>
        <div className="feature-grid">
          <article>
            <h3>Promotion Center</h3>
            <p>公開後に、動画作成・X投稿・note紹介記事・URLコピーを同じ画面から進められます。</p>
          </article>
          <article>
            <h3>X共有テンプレート</h3>
            <p>作品タイトル、紹介文、ハッシュタグ、共有URLを自動生成。投稿前にコピーして確認できます。</p>
          </article>
          <article>
            <h3>note記事テンプレート</h3>
            <p>新作公開のお知らせ文を生成し、noteへ持ち込めます。決済や販売処理には関与しません。</p>
          </article>
        </div>
      </section>

      <section className="landing-section" id="pricing">
        <p className="maker-kicker">Pricing</p>
        <h2>まずは無料で、作品を届ける。</h2>
        <div className="pricing-grid">
          {PRICING_PLANS.map((plan) => (
            <article className="pricing-card" key={plan.id}>
              <h3>{plan.name}</h3>
              <strong>{plan.priceLabel}</strong>
              <ul>
                {plan.features.map((feature) => (
                  <li key={feature}>{feature}</li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>

      <section className="landing-section">
        <p className="maker-kicker">Use cases</p>
        <h2>ポートフォリオにも、研究にも、物語にも。</h2>
        <div className="portfolio-tags" aria-label="利用用途">
          {[
            "小説家",
            "ライター",
            "研究者",
            "講師",
            "先生",
            "デザイナー",
            "フォトグラファー",
            "旅行記",
            "作品集",
            "卒論",
            "論文",
            "会社案内",
            "ホワイトペーパー",
            "商品カタログ",
          ].map((label) => (
            <span key={label}>{label}</span>
          ))}
        </div>
      </section>

      <section className="landing-section muted">
        <p className="maker-kicker">Beta policy</p>
        <h2>安全に小さく始めるための制限</h2>
        <p>
          ベータ版では1ユーザー5作品、本文20万文字、画像30枚まで。課金・クラウド画像最適化・AI生成は今後の工程です。
        </p>
        <Link className="maker-primary-link" href={user ? "/books/new" : "/signup"}>
          Webブックを作成する
        </Link>
      </section>
    </main>
  );
}
