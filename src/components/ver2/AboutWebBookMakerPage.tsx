import Image from "next/image";
import Link from "next/link";

import Ver2Footer from "@/components/ver2/lp/Ver2Footer";
import Ver2Header from "@/components/ver2/lp/Ver2Header";
import AboutZoomableImage from "./AboutZoomableImage";
import styles from "./AboutWebBookMakerPage.module.css";

const sections = [
  { id: "what", label: "書いた文章を、そのままWebブックに。" },
  { id: "reader", label: "読者は、URLをタップするだけ。" },
  { id: "easy", label: "「出版する」より、ずっと手軽に。" },
  { id: "update", label: "毎月更新するWebサイト代わりにも。" },
  { id: "edit", label: "公開した後でも、直せます。" },
  { id: "analytics", label: "より詳細な分析ができます。" },
  { id: "share", label: "各SNSに簡単にシェア。QRコードもすぐ出せる。" },
  { id: "sell", label: "自分の文章を販売することも。" },
  { id: "for", label: "こんな人に。" },
  { id: "compare", label: "Kindleとも、PDFとも、一般的なWebサイトとも違う。" },
];

const demoMetrics = [
  { label: "総閲覧数", value: "1,284" },
  { label: "ユニーク読者", value: "836" },
  { label: "平均読了率", value: "68%" },
  { label: "リンククリック", value: "147" },
];

const demoRetention = [
  ["P1", 100], ["P2", 94], ["P3", 87], ["P4", 78], ["P5", 71], ["P6", 64], ["P7", 58],
] as const;

const demoSources = [
  ["X", 42], ["Direct", 31], ["LINE", 17], ["Other", 10],
] as const;

function Flow({ items, horizontal = false }: { items: string[]; horizontal?: boolean }) {
  return <div className={`${styles.flow} ${horizontal ? styles.flowHorizontal : ""}`} aria-label="WebBookMakerの流れ">{items.map((item, index) => <span key={item}><b>{item}</b>{index < items.length - 1 ? <i aria-hidden="true">{horizontal ? "→" : "↓"}</i> : null}</span>)}</div>;
}

function SectionFigure({ src, alt, children }: { src: string; alt: string; children?: React.ReactNode }) {
  return <figure className={styles.figure}><div className={styles.figureImage}><Image src={src} alt={alt} fill sizes="(max-width: 700px) 90vw, 360px" /></div>{children ? <figcaption>{children}</figcaption> : null}</figure>;
}

function ProductDiagram({ kind }: { kind: "create" | "update" | "publish" }) {
  const items = kind === "create"
    ? ["文章", "Webブック", "スマホ・PC"]
    : kind === "update"
      ? ["公開済み", "Editorで修正", "最新版"]
      : ["文章を書く", "貼り付ける", "URLを公開"];
  return <div className={styles.productDiagram} aria-label="WebBookMakerの利用イメージ">{items.map((item, index) => <div className={styles.diagramStep} key={item}><span className={styles.diagramIcon} aria-hidden="true">{kind === "create" ? ["✎", "▤", "▱"][index] : kind === "update" ? ["◉", "✎", "↻"][index] : ["✎", "＋", "↗"][index]}</span><b>{item}</b>{index < items.length - 1 ? <i aria-hidden="true">→</i> : null}</div>)}</div>;
}

function ShareScreen() {
  return <figure className={styles.screenFigure}><div className={styles.shareScreenshot}><Image src="/about/share-screen-hq.png" alt="WebBookMakerのSNS共有とQRコード発行画面" fill sizes="(max-width: 700px) 90vw, 430px" /></div><figcaption>WebBookMakerの共有・QRコード画面</figcaption></figure>;
}

function PaywallScreen() {
  return <figure className={styles.screenFigure}><div className={styles.paywallScreen}><div className={styles.paywallBook}><span>CHAPTER 02</span><h3>ここからは有料</h3><p>続きの文章を読むには、購入後に発行される閲覧コードを入力してください。</p><div className={styles.paywallRule} /><small>無料部分を読んでから続きを読む</small></div><div className={styles.paywallActions}><b>🔒 ここからは有料</b><span>購入して続きを読む</span><button type="button">閲覧コードを入力</button></div></div><figcaption>読者に表示される有料ページのイメージ</figcaption></figure>;
}

function LineVisual() {
  return <div className={styles.lineVisual} aria-label="LINEで公開URLを送ってWebブックを読む流れ"><div className={styles.phoneFrame}><span className={styles.phoneHeader}>WebBookMaker</span><div className={styles.chatBubble}>これ、読んでみて。<small>WebBookMaker</small><span className={styles.demoUrl}>https://webbookmaker.example/demo</span><b>↗ URLをタップ</b></div></div><span className={styles.lineArrow} aria-hidden="true">↓</span><div className={styles.readerMini}><span>WebBook</span><b>ページをめくって読む</b><i aria-hidden="true">▤</i></div></div>;
}

function StoreBookVisual() {
  return <figure className={styles.storeVisual} aria-label="お店紹介Webブックと毎月更新のイメージ"><div className={styles.storeImage}><AboutZoomableImage src="/about/sunny-cafe-book.png" alt="SUNNY CAFEのWebブック見本" sizes="(max-width: 640px) 100vw, 620px" width={1536} height={1024} /></div><div className={styles.storeMonths}><span>4月号</span><i aria-hidden="true">→</i><span>5月号</span><i aria-hidden="true">→</i><span>6月号</span></div><figcaption>毎月の最新情報をWebブックでお届け</figcaption></figure>;
}

export default function AboutWebBookMakerPage() {
  return (
    <div className={styles.page}>
      <Ver2Header />
      <main>
        <div className={styles.breadcrumb}><Link href="/">ホーム</Link><span aria-hidden="true">›</span><span>WebBookMakerって何？</span></div>
        <div className={styles.layout}>
          <aside className={styles.toc} aria-label="この記事の内容">
            <div className={styles.tocInner}>
              <h2>この記事の内容</h2>
              <ol>{sections.map((section, index) => <li key={section.id}><a href={`#${section.id}`}><span>{String(index + 1).padStart(2, "0")}</span>{section.label}</a></li>)}</ol>
              <Link className={styles.tocBookmark} href="/signup?next=%2Fbooks%2Fnew">ブックマークする <span aria-hidden="true">♡</span></Link>
            </div>
          </aside>

          <article className={styles.article}>
            <header className={styles.articleHero}>
              <p className={styles.eyebrow}>WebBookMakerのサービス紹介</p>
              <h1>WebBookMakerって何？</h1>
              <p className={styles.heroLead}>書いた文章を、あなたの一冊のWebブックに。<br />アプリも、読者登録も必要ありません。</p>
            </header>

            <section id="what" className={styles.articleSection}>
              <div className={styles.sectionContent}><h2>書いた文章を<br />そのまま「Webブック」に。</h2><p>WebBookMakerは、あなたが書いた文章を、<strong className={styles.accentText}>ページをめくって読めるWebブック</strong>に変えて、<strong className={styles.accentText}>URLで公開</strong>できるサービスです。</p><p>小説、エッセイ、noteやブログの記事、教材、専門知識、旅行記、作品集など。<br />文章を用意したら、WebBookMakerに貼り付けて整えるだけ。</p><p>Web制作やプログラミングの知識がなくても、自分で手軽に一冊のWebブックを作れます。</p></div>
              <div className={styles.visualStack}><SectionFigure src="/sample-images/hoshifuru-lp-complete.png" alt="ページをめくって読めるWebブックのサンプル" /><ProductDiagram kind="create" /></div>
            </section>

            <section id="reader" className={`${styles.articleSection} ${styles.readerSection}`}>
              <div className={styles.sectionContent}><h2>読者は、URLをタップするだけ。</h2><p>WebBookMakerの大きな特徴は、読む人に面倒な準備をさせないことです。</p><p><strong className={styles.accentText}>専用アプリはいりません。</strong><br /><strong className={styles.accentText}>アカウントを作る必要もありません。</strong><br /><strong className={styles.accentText}>ログインも必要ありません。</strong></p><p>作者から送られてきたURLをタップすれば、スマートフォンやPCのブラウザですぐにWebブックが開きます。</p><p>SNS、LINE、メール、ブログなどで、</p><blockquote>「これ、読んでみて。」</blockquote><p>とURLを送るだけ。読者はその場ですぐ読み始められます。</p></div><LineVisual />
            </section>

            <section id="easy" className={`${styles.articleSection} ${styles.easySection}`}>
              <div className={styles.sectionContent}><h2>出版するより ずっと手軽に。</h2><p>電子書籍を作るとなると、</p><ul><li>「ファイル形式は？」</li><li>「電子書籍Readerは？」</li><li>「ストアへの登録は？」</li><li>「出版方法は？」</li></ul><p>など、難しそうに感じる人も少なくありません。</p><p>WebBookMakerなら、</p><Flow horizontal items={["文章を書く", "貼り付ける", "Webブックにする", "URLを公開する"]} /><p>というシンプルな流れです。しかも、専門業者へWeb制作を依頼する必要はありません。自分で作れるから、安価に利用できます。</p></div><figure className={styles.storeVisual} aria-label="WebBookMaker Editorのイメージ"><div className={styles.storeImage}><AboutZoomableImage src="/about/editor-paste-step-hq.png" alt="WebBookMakerで文章を貼り付けるEditor画面" sizes="(max-width: 640px) 100vw, 620px" width={1360} height={766} zoomScale="half" /></div></figure>
            </section>

            <section id="update" className={styles.articleSection}>
              <div className={styles.sectionContent}><h2>毎月更新するWebサイト代わりにも。</h2><p>WebBookMakerは、一度作って終わりの作品だけでなく、定期的に情報を更新したい人にも便利です。</p><p>たとえば、</p><ul><li>お店の紹介や最新情報</li><li>教室やスクールの通信</li><li>サークルやコミュニティのお知らせ</li><li>毎月のニュースレター</li><li>イベントやキャンペーンの案内</li><li>商品やサービスのカタログ</li><li>会社や団体の広報誌</li></ul><p>など。毎月の内容を新しいWebブックとして公開すれば、Webサイトを一から作り直さなくても、読みやすい形で情報を届けられます。</p><p>URLをSNSやLINE、メールで案内するだけなので、紙の通信を配るような感覚で、Web上に最新号を公開できます。</p></div>
              <StoreBookVisual />
            </section>

            <section id="edit" className={styles.articleSection}>
              <div className={styles.sectionContent}><h2>公開した後でも、直せます。</h2><p>紙の本や一般的な電子出版との大きな違いです。</p><p>WebBookMakerのWebブックは、<strong className={styles.accentText}>公開した後でも編集</strong>できます。</p><ul><li>誤字を見つけた。</li><li>新しい情報を追加したい。</li><li>写真を変更したい。</li><li>営業時間や料金を更新したい。</li><li>教室の予定やお店のお知らせを差し替えたい。</li><li>説明をもっと分かりやすくしたい。</li></ul><p>そんなときも、公開済みのWebブックを更新できます。同じURLを配り直す必要もありません。</p><p>Webブックは、「完成したら終わり」ではなく、公開後も育てていけます。毎月更新するお店の紹介や教室通信も、最新の情報に保ったまま運用できます。</p></div><ProductDiagram kind="update" />
            </section>

            <section id="analytics" className={styles.articleSection}>
              <div className={styles.sectionContent}><h2>より詳細な分析ができます。</h2><p>WebBookMakerでは、公開するだけで終わりません。</p><p>たとえば、</p><ul><li>何人に読まれたか</li><li>どのページまで読まれたか</li><li>どこで読むのをやめたか</li><li>どこから読者が来たか</li><li><strong className={styles.accentText}>リンクが何回クリックされたか</strong></li></ul><p>などを確認できるAnalyticsを用意します。</p><Flow horizontal items={["読者の反応を見る", "文章や構成を直す", "もう一度反応を見る"]} /><p>「読まれ方」を見ながら、作品やお知らせを改善していけます。</p></div>
              <div className={styles.analyticsPanel} aria-label="Analytics表示例">
                <div className={styles.analyticsPanelHead}><strong>Analytics</strong><small>表示例</small></div>
                <div className={styles.metricGrid}>{demoMetrics.map((metric) => <div className={styles.metricCard} key={metric.label}><span>{metric.label}</span><b>{metric.value}</b></div>)}</div>
                <div className={styles.analyticsCharts}>
                  <div className={styles.chartBlock}><h3>ページ別読了率</h3><div className={styles.retentionRows}>{demoRetention.map(([page, value]) => <div className={styles.retentionRow} key={page}><span>{page}</span><div className={styles.retentionTrack}><i style={{ width: `${value}%` }} /></div><b>{value}%</b></div>)}</div></div>
                  <div className={styles.chartBlock}><h3>流入元</h3><div className={styles.sourceRows}>{demoSources.map(([source, value]) => <div className={styles.sourceRow} key={source}><span>{source}</span><div className={styles.sourceTrack}><i style={{ width: `${value}%` }} /></div><b>{value}%</b></div>)}</div></div>
                </div>
              </div>
            </section>

            <section id="share" className={`${styles.articleSection} ${styles.shareSection}`}>
              <div className={styles.sectionContent}><h2>各SNSに簡単にシェア。QRコードもすぐ出せる。</h2><p>作ったWebブックは、各SNSへ簡単にシェアできます。</p><p>X、Facebook、LINEなどへ共有したり、URLをコピーしてメールやブログで案内したりできます。</p><p>QRコードもすぐに発行できるので、チラシ、名刺、店頭POP、パンフレットなど、紙からWebブックへ読者を案内する使い方もできます。</p></div>
              <ShareScreen />
            </section>

            <section id="sell" className={styles.articleSection}>
              <div className={styles.sectionContent}><h2>自分の文章を販売することも。</h2><blockquote className={styles.paywallQuote}>「最初の数ページは無料で読んでもらい、続きは有料にしたい。」</blockquote><p>そんな使い方にも対応します。</p><Flow horizontal items={["URLをタップ", "無料部分をすぐ読む", "ここから先は有料", "購入", "続きを読む"]} /><p>読者は、最初から会員登録して購入する必要はありません。</p><p>まず読んでもらって、気に入った人に続きを購入してもらう。そんなWebならではの販売方法ができます。</p></div>
              <PaywallScreen />
            </section>

            <section id="for" className={styles.articleSection}><div className={styles.sectionContent}><h2>こんな人に。</h2><ul className={styles.twinList}><li>小説を書いている。</li><li>noteやブログの記事がたまっている。</li><li>自分の専門知識を一冊にまとめたい。</li><li>オンライン講座の教材を作りたい。</li><li>旅行記や写真集を作りたい。</li><li>お店の紹介や最新情報を毎月届けたい。</li><li>教室通信やニュースレターを定期的に発行したい。</li><li>Webサイトの代わりに、読みやすい形で情報を公開したい。</li><li>自分の文章を直接販売してみたい。</li></ul><p>そんな人が、専門知識なしでWeb上に「自分の一冊」を持つためのサービスです。</p></div><div className={styles.forVisual} aria-label="WebBookMakerが活躍するシーン"><span>✦</span><b>文章をまとめる</b><span>✦</span><b>読みやすく届ける</b><span>✦</span><b>公開後も育てる</b></div></section>

            <section id="compare" className={`${styles.articleSection} ${styles.compareSection}`}><div className={styles.sectionContent}><h2>Kindleとも、PDFとも、一般的なWebサイトとも違う。</h2><p>Kindleには、Amazonという大きな書店で出版できる強みがあります。PDFには、ファイルとして簡単に配れる強みがあります。一般的なWebサイトには、情報を常に更新して公開できる強みがあります。</p><p>WebBookMakerが目指しているのは、それらの良さを取り入れながら、文章を読みやすい一冊の形にして、手軽に公開・更新できるサービスです。</p><div className={styles.comparisonVisual} aria-label="Kindle・PDF・Webサイト・WebBookMakerの比較"><div><b>Kindle</b><span>大きな書店で出版</span></div><div><b>PDF</b><span>ファイルで配布</span></div><div><b>Webサイト</b><span>常時更新</span></div><div className={styles.comparisonFocus}><b>WebBookMaker</b><span>文章を一冊の形で公開・更新</span></div></div><ul className={styles.featureList}><li>URLをタップしたら、すぐ読める。</li><li>アプリ不要。</li><li>読者登録不要。</li><li>ログイン不要。</li><li>作者自身で手軽に作れる。</li><li>安価に公開できる。</li><li>公開後でも編集できる。</li><li>毎月更新する情報発信にも使える。</li><li>より詳細な分析ができる。</li><li>各SNSへ簡単にシェアできる。</li><li>QRコードもすぐ出せる。</li><li>必要なら、そのまま収益化できる。</li></ul></div></section>

            <section className={styles.finalCta} aria-labelledby="about-cta-title"><h2 id="about-cta-title">あなたの文章に、「読む場所」をつくる。</h2><p>文章は、もう書いてある。<br />お店や教室から届けたい情報も、もうある。<br />あとは、それを一冊にするだけ。</p><strong>WebBookMaker</strong><span>書いた文章を、そのままWebブックに。</span><Link href="/signup?next=%2Fbooks%2Fnew">今すぐ始める <span aria-hidden="true">→</span></Link></section>
          </article>
        </div>
      </main>
      <Ver2Footer />
    </div>
  );
}
