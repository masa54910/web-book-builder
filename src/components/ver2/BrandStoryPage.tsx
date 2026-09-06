import Image from "next/image";
import Link from "next/link";

import Button from "@/components/ui/Button";
import ArticleReveal from "@/components/ver2/ArticleReveal";
import BrandArticleLinks from "@/components/ver2/BrandArticleLinks";
import Ver2Footer from "@/components/ver2/lp/Ver2Footer";
import Ver2Header from "@/components/ver2/lp/Ver2Header";
import styles from "./BrandStoryPage.module.css";

const sections = [
  { id: "buried", title: "頑張って書いた。でも、埋もれた。" },
  { id: "presentation", title: "ところが、「見せ方」を変えたら反応が変わった。" },
  { id: "delivery", title: "文章ではなく、「届け方」の問題だったのかもしれない。" },
  { id: "calling-card", title: "Webブックが、名刺代わりになった。" },
  { id: "platform", title: "だったら、自分だけで使うのはもったいない。" },
  { id: "ai", title: "AIがあるなら、誰でも作れる？" },
  { id: "maker", title: "こうしてWebBookMakerを作りました。" },
] as const;

function SectionHeading({ number, title }: { number: string; title: string }) {
  return (
    <div className={styles.sectionHeader}>
      <span className={styles.sectionNumber}>{number}</span>
      <h2>{title}</h2>
    </div>
  );
}

function ReadingFlow() {
  const items = ["表紙", "開く", "目次", "章", "ページをめくる", "続きを読む"];

  return (
    <div className={styles.readingFlow} aria-label="Webブックを読む流れ">
      {items.map((item, index) => (
        <span key={item}>
          <b>{item}</b>
          {index < items.length - 1 ? <i aria-hidden="true">→</i> : null}
        </span>
      ))}
    </div>
  );
}

export default function BrandStoryPage() {
  return (
    <div className={styles.page}>
      <Ver2Header />
      <main>
        <div className={styles.breadcrumb}>
          <Link href="/">ホーム</Link>
          <span aria-hidden="true">›</span>
          <span>なぜ、このWebBookMakerを作ったか。</span>
        </div>

        <div className={styles.layout}>
          <aside className={styles.toc} aria-label="この記事の内容">
            <h2>この記事の内容</h2>
            <ol>
              {sections.map((section, index) => (
                <li key={section.id}>
                  <a href={`#${section.id}`}>
                    <span className={styles.tocNumber}>{String(index + 1).padStart(2, "0")}</span>
                    <span>{section.title}</span>
                  </a>
                </li>
              ))}
            </ol>
          </aside>

          <article className={styles.article}>
            <header className={styles.hero}>
              <p className={styles.eyebrow}>BRAND STORY</p>
              <h1>なぜ、このWebBookMakerを作ったか。</h1>
              <p className={styles.heroLead}>
                書いた文章が読まれないとき、文章そのものではなく、届け方を変えてみる。その発見が、WebBookMakerの始まりでした。
              </p>
              <div className={styles.heroMeta} aria-label="記事情報">
                <span>WebBookMaker 運営者</span>
                <span>読了目安 7分</span>
              </div>
            </header>

            <ArticleReveal>
              <section id="buried" className={styles.storySection}>
                <SectionHeading number="01" title="頑張って書いた。でも、埋もれた。" />
                <div className={styles.prose}>
                  <p>僕はこれまで、noteやブログなどに、小説やノウハウ記事、自分の経験をもとにした文章を書きためてきました。</p>
                  <p>時間を使って書いたものです。自分なりの経験や考えも込めました。でも、思ったほど読まれない。販売してみても、なかなか売れない。</p>
                  <p>新しい記事を書くほど、過去の記事は一覧の奥へ埋もれていきます。せっかく書いたものの資産価値が、ほとんど0円になっていくように感じたこともありました。</p>
                  <p>もちろん、本当に価値がなくなったわけではありません。それでも当時は、文章だけでなく、そこへ込めた自分の経験や価値観まで否定されたような気持ちになることがありました。</p>
                </div>
              </section>
            </ArticleReveal>

            <ArticleReveal>
              <section id="presentation" className={styles.storySection}>
                <SectionHeading number="02" title="ところが、「見せ方」を変えたら反応が変わった。" />
                <div className={styles.prose}>
                  <p>AIが急速に発展していく中で、僕は自分が書いた小説をWebブックの形にして、人に見せてみました。</p>
                  <blockquote className={styles.quote}>「えっ、これ、ご自分で作ったんですか？」</blockquote>
                  <p>予想以上の反応でした。うれしかったのは、Webブックの見た目に驚いてもらえただけではありません。その流れで、中に入っている小説そのものまで実際に読んでもらえたことです。</p>
                  <p>それまでは、「ネットに小説を掲載しているので、よかったら読んでください」と紹介していました。ただ、章ごとに記事が分かれていると、次の記事を探したり、順番にページを移動したりする小さな手間があります。実際、アクセス数は微々たるものでした。</p>
                  <ReadingFlow />
                  <figure className={styles.bookFigure}>
                    <div className={styles.bookImage}>
                      <Image src="/sample-images/hoshifuru-lp-complete.png" alt="表紙からページをめくって読めるWebブックのイメージ" fill sizes="(max-width: 640px) calc(100vw - 28px), 640px" />
                    </div>
                    <figcaption>文章を、表紙・目次・章のある「一冊」として届ける。</figcaption>
                  </figure>
                  <p>文章そのものを大きく変えたわけではありません。表紙から始まり、目次を開き、ページをめくって続きを読む「一冊」に変えただけです。それでも、反応は変わりました。</p>
                </div>
              </section>
            </ArticleReveal>

            <ArticleReveal>
              <section id="delivery" className={`${styles.storySection} ${styles.messageSection}`}>
                <SectionHeading number="03" title="文章ではなく、「届け方」の問題だったのかもしれない。" />
                <div className={styles.prose}>
                  <p>この体験から、ひとつのことを考えるようになりました。</p>
                  <div className={styles.keyMessage}>
                    <span>読まれなかった文章に、</span>
                    <span>価値がなかったとは限らない。</span>
                  </div>
                  <p><strong>単に、その文章に合った「届け方」がなかっただけかもしれない。</strong></p>
                  <p>長い文章には、長い文章に合った入口があります。作品の世界へ入り、順番に読み進められる形に変わるだけで、読む人との距離は少し縮まるのかもしれません。</p>
                  <p className={styles.brandMessage}>書いたものに、新たな届け方を。</p>
                </div>
              </section>
            </ArticleReveal>

            <ArticleReveal>
              <section id="calling-card" className={styles.storySection}>
                <SectionHeading number="04" title="Webブックが、名刺代わりになった。" />
                <div className={styles.prose}>
                  <p>Webブックにすると、URLひとつで渡せます。スマートフォンでもすぐに開けます。</p>
                  <ul className={styles.pointList}>
                    <li>表紙がある</li>
                    <li>目次がある</li>
                    <li>ページをめくれる</li>
                    <li>画像も含めて見せられる</li>
                  </ul>
                  <p>「これ、僕が書いたものなんです」と、その場で人へ渡せる。Webブックそのものが、一種の名刺のようになりました。</p>
                  <p>自分の場合は、そこからSNSを知ってもらったり、結果としてフォローしてもらったりすることにもつながりました。URLやQRコードで渡せて、公開後も直せること。読まれ方をAnalyticsで確かめられ、必要なら販売もできること。どれも、文章を届け続けるために欲しかった仕組みです。</p>
                </div>
              </section>
            </ArticleReveal>

            <ArticleReveal>
              <section id="platform" className={styles.storySection}>
                <SectionHeading number="05" title="だったら、自分だけで使うのはもったいない。" />
                <div className={styles.prose}>
                  <div className={styles.turningPoint}>
                    <blockquote className={styles.quote}>「良い感じで読めました！」</blockquote>
                    <p>Webブックを渡した相手から、そんな言葉をもらいました。</p>
                  </div>
                  <p>そのとき、自分と同じように、すでに文章を書いている人にもこの届け方を使ってもらえたら、お互いうれしいのではないかと思いました。</p>
                  <p>記事を書きためている人。作品を持っている人。自分の経験や知識を書いてきた人。新しく書き直さなくても、手元にある文章から始められます。</p>
                  <div className={styles.transitionLine} aria-label="WebBookMakerがサービスになるまで">
                    <span>自分用のWebブック</span>
                    <i aria-hidden="true">→</i>
                    <span>ほかの人も使えるサービスへ</span>
                  </div>
                  <p>ここが、WebBookMakerを自分だけの道具ではなく、ほかの人も利用できるサービスとして作ろうと考えた転換点でした。</p>
                </div>
              </section>
            </ArticleReveal>

            <ArticleReveal>
              <section id="ai" className={styles.storySection}>
                <SectionHeading number="06" title="AIがあるなら、誰でも作れる？" />
                <div className={styles.prose}>
                  <p>AIは急速に発展しています。AIエージェント（ご存じでしょうか？）を使えば、Webサービスそのものを作れる時代になりつつあります。</p>
                  <p>ただ、「電子書籍のようなものを作る」ことと、いろいろな人が普通に使えるWebサービスとして提供することは別でした。</p>
                  <ul className={styles.serviceList}>
                    <li>リアルなページめくり</li>
                    <li>PC・スマートフォン対応</li>
                    <li>文章のページ分割と読みやすさの調整</li>
                    <li>画像の配置</li>
                    <li>保存と公開URL</li>
                    <li>必要に応じた販売</li>
                    <li>Analytics</li>
                    <li>Security</li>
                  </ul>
                  <p>これらをひとつのサービスとして成立させるには、相応の設計と試行錯誤が必要でした。</p>
                  <p><strong>その面倒な部分はこちらで作る。</strong>使う人には、「すでに書いたもの」を持ってきてもらえばいい。そう考えて、少しずつ仕組みを整えていきました。</p>
                </div>
              </section>
            </ArticleReveal>

            <ArticleReveal>
              <section id="maker" className={styles.storySection}>
                <SectionHeading number="07" title="こうしてWebBookMakerを作りました。" />
                <div className={styles.prose}>
                  <p>WebBookMakerは、単にWeb上でページをめくるためのツールとして作ったものではありません。</p>
                  <p>すでに書いたものに、別の見せ方と渡し方を与えるためのサービスです。</p>
                  <ul className={styles.closingList}>
                    <li>原稿</li>
                    <li>記事</li>
                    <li>小説</li>
                    <li>エッセイ</li>
                    <li>ノウハウ</li>
                    <li>経験</li>
                    <li>知識</li>
                  </ul>
                  <p>読まれなかったからといって、書いたものに価値がなかったとは限りません。届け方を変えることで、その文章がもう一度、誰かに届く入口を作れるかもしれない。</p>
                  <p className={styles.closingMessage}>書いたものに、新たな届け方を。</p>
                </div>
              </section>
            </ArticleReveal>

            <div className={styles.moreLinks}>
              <BrandArticleLinks current="why" />
            </div>

            <section className={styles.finalCta} aria-labelledby="brand-story-cta-title">
              <h2 id="brand-story-cta-title">あなたが書いたものを、一冊に。</h2>
              <p>手元にある文章から、Webブックという新しい届け方を試してみませんか。</p>
              <div className={styles.ctaActions}>
                <Button href="/signup?next=%2Fbooks%2Fnew" size="lg" className={styles.ctaButton}>WebBookMakerを使ってみる</Button>
                <Button href="/about" variant="secondary" size="lg" className={styles.ctaButton}>WebBookMakerって何？</Button>
              </div>
            </section>
          </article>
        </div>
      </main>
      <Ver2Footer />
    </div>
  );
}
