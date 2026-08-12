import Image from "next/image";
import Link from "next/link";

import Ver2Footer from "@/components/ver2/lp/Ver2Footer";
import Ver2Header from "@/components/ver2/lp/Ver2Header";
import styles from "./UseCasesPage.module.css";

type PointIconKind = "create" | "price" | "files" | "update";

const points: Array<{
  number: string;
  title: string;
  titleLines?: string[];
  body: string;
  takeaway: string;
  icon: PointIconKind;
}> = [
  {
    number: "01",
    title: "自分でかんたんに作れる",
    body: "テキストを貼るだけ、または入力するだけでOK。制作会社とのやり取りや特別なスキルは必要ありません。",
    takeaway: "すぐに作り始められます！",
    icon: "create",
  },
  {
    number: "02",
    title: "個人でも使える安心の価格",
    body: "出版プランは1作品980円から。サブスクでも月額1,980円と続けやすい価格で、気軽にWebブックを公開できます。",
    takeaway: "リーズナブルな価格で安心！",
    icon: "price",
  },
  {
    number: "03",
    title: "PDFや特別なファイルはいりません",
    titleLines: ["PDFや特別なファイルは", "いりません"],
    body: "PDF変換や入稿の手間は不要。文章を貼る・入力するだけで、すぐにWebブックが完成します。",
    takeaway: "シンプルな3ステップで、サクッと完成！",
    icon: "files",
  },
  {
    number: "04",
    title: "公開後も編集・改善できる",
    titleLines: ["公開後もいつでも", "編集・改善できる"],
    body: "出版プランは公開後7日間、運用プランは公開後もいつでも編集可能。公開して終わりではなく、作品を育てていけます。",
    takeaway: "公開後もずっと活用できる！",
    icon: "update",
  },
];

const protectedPointPhrases = new Set([
  "WebBookMaker",
  "Webブック",
  "PDF",
  "1作品980円",
  "月額1,980円",
  "公開後",
  "作りはじめられます",
  "編集・改善",
  "3ステップ",
]);

const protectedPointPhrasePattern = /(WebBookMaker|Webブック|PDF|1作品980円|月額1,980円|公開後|作りはじめられます|編集・改善|3ステップ)/g;

function PointText({ text }: { text: string }) {
  return text.split(protectedPointPhrasePattern).map((part, index) => (
    protectedPointPhrases.has(part)
      ? <span className={styles.noBreak} key={`${part}-${index}`}>{part}</span>
      : part
  ));
}

const scenes: Array<{
  sampleId: "teacher" | "recipe" | "blog" | "research" | "writer" | "photographer";
  label: string;
  title: string;
  body: string;
  image: string;
}> = [
  {
    sampleId: "teacher",
    label: "講師・先生",
    title: "教材や教本を気軽に",
    body: "自分で作った教材やテキストをそのままWebブックに。生徒さんへの配布もラクになります。",
    image: "/use-cases/teacher-materials.webp",
  },
  {
    sampleId: "recipe",
    label: "料理教室の方に",
    title: "レシピやコツを一冊に",
    body: "レシピやコツを一冊にまとめて、レッスン後の共有に。内容の更新もいつでもできます。",
    image: "/use-cases/recipe-book.webp",
  },
  {
    sampleId: "blog",
    label: "note・ブログの方に",
    title: "書きためた記事を作品集に",
    body: "書きためた記事をテーマごとにまとめて、あなただけの作品集に。ファンへのプレゼントにもぴったり！",
    image: "/use-cases/note-blog.webp",
  },
  {
    sampleId: "research",
    label: "研究者・学生の方に",
    title: "研究成果を読みやすく",
    body: "研究レポートや論文、卒業研究のまとめなどを見やすく整理。発表や共有にも役立ちます。",
    image: "/use-cases/research-paper.webp",
  },
  {
    sampleId: "writer",
    label: "作家・エッセイストの方に",
    title: "世界観をそのまま届ける",
    body: "エッセイや短編小説を一冊にまとめて、あなたの世界観をそのまま読者へ届けられます。",
    image: "/use-cases/writer-essay.webp",
  },
  {
    sampleId: "photographer",
    label: "写真家・クリエイターの方に",
    title: "作品をスマートに見せる",
    body: "作品集やポートフォリオをページをめくるフォトブックとして公開。URLやQRで簡単にシェアできます。",
    image: "/use-cases/photographer-portfolio.webp",
  },
];

function PointIcon({ kind }: { kind: PointIconKind }) {
  const common = {
    viewBox: "0 0 64 64",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2.4,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };

  if (kind === "create") {
    return <svg {...common}><rect x="10" y="15" width="44" height="31" rx="3" /><path d="M18 52h28M24 46v6M40 46v6M22 25h16M22 31h10" /><path d="m43 29 7-7 5 5-7 7-7 2z" /></svg>;
  }
  if (kind === "price") {
    return <svg {...common}><path d="M32 10v44M42 19c-2-3-5-4-10-4-6 0-10 3-10 8 0 12 21 6 21 18 0 5-4 8-11 8-5 0-9-2-11-5" /><path d="M20 15h24M20 49h24" /></svg>;
  }
  if (kind === "files") {
    return <svg {...common}><path d="m18 22 7-7h24v31H25l-7-7z" /><path d="M25 15v8h-7" /><path d="m38 28 12 12M50 28 38 40" /></svg>;
  }
  return <svg {...common}><path d="M51 25a20 20 0 0 0-35-5M13 39a20 20 0 0 0 35 5" /><path d="m49 14 2 11-11-2M15 50l-2-11 11 2" /><path d="M32 20v12l8 5" /></svg>;
}

export default function UseCasesPage() {
  return (
    <div className={styles.page}>
      <Ver2Header />
      <main>
        <div className={`${styles.container} ${styles.breadcrumb}`}>
          <Link href="/">ホーム</Link>
          <span aria-hidden="true">›</span>
          <span>WebBookMakerのおすすめポイント</span>
        </div>

        <section className={styles.hero} aria-labelledby="use-cases-title">
          <div className={styles.heroDecoration} aria-hidden="true"><span>♡</span><span>✎</span></div>
          <p className={styles.heroKicker}>WebBookMakerの</p>
          <h1 id="use-cases-title">おすすめ<span>ポイント</span></h1>
          <p className={styles.heroLead}>書いた文章を、あなただけの一冊の本に。<br />しかも、<strong>かんたん・低価格・ずっと使える！</strong></p>
        </section>

        <section className={`${styles.container} ${styles.pointsSection}`} aria-labelledby="point-heading">
          <h2 id="point-heading" className={styles.srOnly}>WebBookMakerのおすすめポイント</h2>
          <div className={styles.pointGrid}>
            {points.map((point) => (
              <article className={styles.pointCard} key={point.number}>
                <div className={styles.pointNumber}>{point.number}</div>
                <h3>{point.titleLines ? point.titleLines.map((line, index) => <span key={line}>{index > 0 ? <br /> : null}<PointText text={line} /></span>) : <PointText text={point.title} />}</h3>
                <div className={styles.pointIcon}><PointIcon kind={point.icon} /></div>
                <p><PointText text={point.body} /></p>
                <div className={styles.pointTakeaway}>
                  <span className={styles.pointTakeawayIcon} aria-hidden="true">✓</span>
                  <span className={styles.pointTakeawayText}><PointText text={point.takeaway} /></span>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className={`${styles.container} ${styles.sceneSection}`} aria-labelledby="scene-heading">
          <h2 id="scene-heading"><span aria-hidden="true">✦</span>いろんなシーンで活用できます！<span aria-hidden="true">✦</span></h2>
          <div className={styles.sceneGrid}>
            {scenes.map((scene) => (
              <article className={styles.sceneCard} key={scene.label}>
                <div className={styles.sceneLabel}>{scene.label}</div>
                <div className={styles.sceneVisual}>
                  <Image src={scene.image} alt="" fill sizes="(max-width: 640px) 90vw, (max-width: 1000px) 30vw, 220px" />
                </div>
                <h3>{scene.title}</h3>
                <p>{scene.body}</p>
                <button
                  type="button"
                  className={styles.sceneCta}
                  aria-disabled="true"
                  data-sample-id={scene.sampleId}
                >
                  サンプルを見る
                </button>
              </article>
            ))}
          </div>
        </section>

        <section className={`${styles.container} ${styles.summarySection}`} aria-labelledby="summary-heading">
          <div className={styles.summaryCopy}>
            <h2 id="summary-heading">まとめると、WebBookMakerは…</h2>
            <ul>
              <li>自分でかんたんに作れるから、誰でも気軽に始められる！</li>
              <li>個人でも手が届く価格で、作品を形にできる！</li>
              <li>PDFいらずで、テキストを貼るだけで完成！</li>
              <li>公開後も編集できて、あなたの作品を育てていける！</li>
            </ul>
          </div>
          <div className={styles.summaryBook} aria-hidden="true">
            <Image src="/sample-images/hoshifuru-lp-complete.png" alt="" fill sizes="(max-width: 680px) 90vw, 420px" />
          </div>
          <div className={styles.summaryBubble}>あなたの文章が、<br /><strong>世界にひとつの<br />“めくれるWebブック”に。</strong><span aria-hidden="true">✦</span></div>
        </section>

        <section className={styles.ctaSection} aria-labelledby="use-cases-cta-title">
          <div className={styles.ctaInner}>
            <div>
              <h2 id="use-cases-cta-title">まずは無料で体験してみませんか？</h2>
              <p>アカウント登録（無料）で、すぐにWebブック作りを始められます。</p>
            </div>
            <Link href="/signup?next=%2Fbooks%2Fnew" className={styles.ctaButton}>無料ではじめる <span aria-hidden="true">→</span></Link>
          </div>
        </section>
      </main>
      <Ver2Footer />
    </div>
  );
}
