import Image from "next/image";
import Link from "next/link";

import Ver2Footer from "@/components/ver2/lp/Ver2Footer";
import Ver2Header from "@/components/ver2/lp/Ver2Header";
import { SAMPLE_BOOK_COVER_IMAGE } from "@/lib/sampleBookConstants";
import styles from "./UseCasesPage.module.css";

type PointIconKind = "create" | "price" | "files" | "update";
type SceneIconKind = "teacher" | "cooking" | "writer" | "research" | "author" | "camera";

const points: Array<{
  number: string;
  title: string;
  body: string;
  takeaway: string;
  icon: PointIconKind;
}> = [
  {
    number: "01",
    title: "自分でかんたんに作れる",
    body: "テキストを貼るだけ、または入力するだけでOK。制作会社とのやり取りや特別なスキルは必要ありません。",
    takeaway: "思い立ったその日から、すぐに作りはじめられます！",
    icon: "create",
  },
  {
    number: "02",
    title: "個人でも使える安心の価格",
    body: "出版プランは1作品980円から。サブスクでも月額1,980円と続けやすい価格で、気軽にWebブックを公開できます。",
    takeaway: "価格を気にせず、あなたの作品をカタチに！",
    icon: "price",
  },
  {
    number: "03",
    title: "PDFや特別なファイルはいりません",
    body: "PDF変換や入稿の手間は不要。文章を貼る・入力するだけで、すぐにWebブックが完成します。",
    takeaway: "シンプルな3ステップで、サクッと完成！",
    icon: "files",
  },
  {
    number: "04",
    title: "公開後も編集・改善できる",
    body: "出版プランは公開後7日間、運用プランは公開後もいつでも編集可能。公開して終わりではなく、作品を育てていけます。",
    takeaway: "公開して終わりじゃないから、ずっと役立つ一冊に！",
    icon: "update",
  },
];

const scenes: Array<{
  label: string;
  title: string;
  body: string;
  icon: SceneIconKind;
  image: string;
}> = [
  {
    label: "講師・先生",
    title: "教材や教本を気軽に",
    body: "自分で作った教材やテキストをそのままWebブックに。生徒さんへの配布もラクになります。",
    icon: "teacher",
    image: "/sample-images/hoshifuru-01.webp",
  },
  {
    label: "料理教室の方に",
    title: "レシピやコツを一冊に",
    body: "レシピやコツを一冊にまとめて、レッスン後の共有に。内容の更新もいつでもできます。",
    icon: "cooking",
    image: "/sample-images/hoshifuru-02.webp",
  },
  {
    label: "note・ブログの方に",
    title: "書きためた記事を作品集に",
    body: "書きためた記事をテーマごとにまとめて、あなただけの作品集に。ファンへのプレゼントにもぴったり！",
    icon: "writer",
    image: "/sample-images/hoshifuru-03.webp",
  },
  {
    label: "研究者・学生の方に",
    title: "研究成果を読みやすく",
    body: "研究レポートや論文、卒業研究のまとめなどを見やすく整理。発表や共有にも役立ちます。",
    icon: "research",
    image: "/sample-images/hoshifuru-04.webp",
  },
  {
    label: "作家・エッセイストの方に",
    title: "世界観をそのまま届ける",
    body: "エッセイや短編小説を一冊にまとめて、あなたの世界観をそのまま読者へ届けられます。",
    icon: "author",
    image: "/sample-images/hoshifuru-05.webp",
  },
  {
    label: "写真家・クリエイターの方に",
    title: "作品をスマートに見せる",
    body: "作品集やポートフォリオをページをめくるWebブックとして公開。URLやQRで簡単にシェアできます。",
    icon: "camera",
    image: "/sample-images/hoshifuru-06.webp",
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

function SceneIcon({ kind }: { kind: SceneIconKind }) {
  const common = {
    viewBox: "0 0 48 48",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.9,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };

  if (kind === "teacher") return <svg {...common}><path d="M8 38h32M13 34V12h22v22M18 17h12M18 23h12M18 29h7" /><path d="m37 15 4-4" /></svg>;
  if (kind === "cooking") return <svg {...common}><path d="M7 28h34M10 28c1 9 6 13 14 13s13-4 14-13M15 21c0-4 3-7 7-7s7 3 7 7" /><path d="M22 10V6M32 11l3-4" /></svg>;
  if (kind === "writer") return <svg {...common}><path d="M7 12c6-3 11-3 17 0v28c-6-3-11-3-17 0zM41 12c-6-3-11-3-17 0v28c6-3 11-3 17 0z" /><path d="M13 20h6M13 26h6M29 20h6M29 26h6" /></svg>;
  if (kind === "research") return <svg {...common}><path d="M8 39h32M12 34V18l12-7 12 7v16M19 34V25h10v9" /><path d="M24 7v4" /></svg>;
  if (kind === "author") return <svg {...common}><path d="m11 38 5-17 21-10 3 6-21 10zM16 21l6 6M30 15l5 5" /><path d="M10 42h30" /></svg>;
  return <svg {...common}><path d="M7 20h26l8 8v12H7z" /><circle cx="20" cy="30" r="6" /><path d="M33 20v-6h5l3 6M12 40l-2 4M36 40l2 4" /></svg>;
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
          <div className={styles.heroDecoration} aria-hidden="true"><span>♡</span><span>✎</span><span className={styles.heroBookMark}>▱</span></div>
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
                <h3>{point.title}</h3>
                <div className={styles.pointIcon}><PointIcon kind={point.icon} /></div>
                <p>{point.body}</p>
                <div className={styles.pointTakeaway}><span aria-hidden="true">✓</span>{point.takeaway}</div>
              </article>
            ))}
          </div>
        </section>

        <section className={`${styles.container} ${styles.sceneSection}`} aria-labelledby="scene-heading">
          <h2 id="scene-heading"><span aria-hidden="true">✦</span>いろんなシーンで活躍しています！<span aria-hidden="true">✦</span></h2>
          <div className={styles.sceneGrid}>
            {scenes.map((scene) => (
              <article className={styles.sceneCard} key={scene.label}>
                <div className={styles.sceneLabel}>{scene.label}</div>
                <div className={styles.sceneVisual}>
                  <Image src={scene.image} alt="" fill sizes="(max-width: 640px) 90vw, (max-width: 1000px) 30vw, 220px" />
                  <span className={styles.sceneIcon}><SceneIcon kind={scene.icon} /></span>
                </div>
                <h3>{scene.title}</h3>
                <p>{scene.body}</p>
                <span className={styles.sceneLink}>っていう人にこそおすすめ♪</span>
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
          <div className={styles.summaryDevice} aria-hidden="true">
            <div className={styles.deviceScreen}><Image src={SAMPLE_BOOK_COVER_IMAGE} alt="" fill sizes="360px" /></div>
            <div className={styles.devicePhone}><Image src={SAMPLE_BOOK_COVER_IMAGE} alt="" fill sizes="100px" /></div>
          </div>
          <div className={styles.summaryBubble}>あなたの文章が、<br /><strong>世界にひとつの<br />“めくれる本”に。</strong><span aria-hidden="true">✦</span></div>
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
