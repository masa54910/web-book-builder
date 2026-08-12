import Image from "next/image";
import Link from "next/link";

import QrCodeIcon from "@/components/ui/QrCodeIcon";
import ServiceIcon from "@/components/ui/ServiceIcons";
import { SAMPLE_BOOK_COVER_IMAGE, SAMPLE_BOOK_TITLE } from "@/lib/sampleBookConstants";
import { XShareSampleCard } from "./HomeShareSamples";
import styles from "./Ver2Landing.module.css";

const editorBody = [
  "むかしむかし、ある町に一人の少女がいました。",
  "少女は星が大好きで、夜になるといつも空を見上げていました。",
  "ある日、流れ星がふっと夜空を横切り、その光は少女の心の中に、小さな勇気を灯しました。",
  "その夜から、少女の小さな冒険が始まります――。",
];

const coverLayoutMocks = [
  { id: "01", name: "スタンダード", className: styles.flowLayoutStandard },
  { id: "02", name: "タイトル中央", className: styles.flowLayoutCentered },
  { id: "03", name: "写真全面", className: styles.flowLayoutFullPhoto },
  { id: "04", name: "写真上部", className: styles.flowLayoutPhotoTop },
  { id: "05", name: "写真下部", className: styles.flowLayoutPhotoBottom },
  { id: "06", name: "タイトル大型", className: styles.flowLayoutLargeTitle },
];

function CoverArtwork({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`${styles.flowCoverArtwork} ${compact ? styles.flowCoverArtworkCompact : ""}`}>
      <Image src={SAMPLE_BOOK_COVER_IMAGE} alt={compact ? `${SAMPLE_BOOK_TITLE}の表紙画像` : ""} fill sizes="180px" />
      {compact ? null : (
        <>
          <span>{SAMPLE_BOOK_TITLE}</span>
          <small>WebBookMaker サンプル作者</small>
        </>
      )}
    </div>
  );
}

function EditorFlowMock() {
  return (
    <div className={styles.flowEditorMock} aria-label="WebBookMakerの文章編集画面の見本">
      <div className={styles.flowEditorMain}>
        <strong className={styles.flowUiHeading}>原稿</strong>
        <div className={styles.flowFileRow}>
          <span>TXT / Markdown / Word / PDF / ZIPを読み込む</span>
          <b>ファイルを選択</b>
        </div>
        <small className={styles.flowHelper}>文章の途中にカーソルを置いて、画像を貼り付け・ドラッグ＆ドロップできます。</small>
        <div className={styles.flowTextArea}>
          <strong>{SAMPLE_BOOK_TITLE}</strong>
          {editorBody.map((line) => <p key={line}>{line}</p>)}
        </div>
      </div>
      <aside className={styles.flowEditorAside}>
        <strong className={styles.flowUiHeading}>表紙画像</strong>
        <div className={styles.flowCoverRow}>
          <CoverArtwork compact />
          <div><b>ファイルを選択</b><span>表紙を削除</span></div>
        </div>
        <div className={styles.flowEditorDivider} />
        <strong className={styles.flowUiHeading}>デザイン・公開設定</strong>
        <label>UI言語</label><span className={styles.flowSelect}>日本語 <b>⌄</b></span>
        <label>テーマ</label><span className={styles.flowSelect}>Classic <b>⌄</b></span>
      </aside>
      <div className={styles.flowEditorActions}>
        <b>保存</b><span>プレビュー</span><span>公開する</span>
      </div>
    </div>
  );
}

function CoverFlowMock() {
  return (
    <div className={styles.flowCoverMock} aria-label="表紙を調整する画面の見本">
      <div className={styles.flowModalBar}><strong>表紙を調整</strong><span>×</span></div>
      <div className={styles.flowCoverBody}>
        <div className={styles.flowCoverPreview}><CoverArtwork /></div>
        <div className={styles.flowCoverSettings}>
          <div className={styles.flowSettingsIntro}><strong>表紙デザイン</strong><small>表紙の見た目をPreviewで確認しながら調整できます。</small></div>
          <div className={styles.flowSettingsColumns}>
            <div>
              <label>レイアウト</label>
              <div className={styles.flowLayoutGrid}>
                {coverLayoutMocks.map((layout, index) => (
                  <span key={layout.id} className={index === 0 ? styles.flowLayoutSelected : ""}>
                    <i className={`${styles.flowLayoutThumb} ${layout.className}`} aria-hidden="true">
                      <b className={styles.flowLayoutThumbTitle} />
                      <b className={styles.flowLayoutThumbImage} />
                      <b className={styles.flowLayoutThumbAuthor} />
                    </i>
                    <small><b>{layout.id}</b> {layout.name}</small>
                  </span>
                ))}
              </div>
            </div>
            <div className={styles.flowTypeControls}>
              <label>文字</label>
              <small>表紙タイトル</small>
              <span className={styles.flowMockInput}>{SAMPLE_BOOK_TITLE}</span>
              <span className={styles.flowReset}>元のタイトルに戻す</span>
              <span className={styles.flowCheck}>✓ タイトルを表示</span>
              <small>タイトルサイズ</small>
              <div className={styles.flowScale}><b>−</b><span>45%</span><b>＋</b></div>
              <small>タイトル位置</small>
              <span className={styles.flowMockInput}>中央上 <b>⌄</b></span>
            </div>
          </div>
        </div>
      </div>
      <div className={styles.flowCoverActions}><b>保存</b><span>プレビュー</span></div>
    </div>
  );
}

function ShareFlowMock() {
  return (
    <div className={styles.flowShareMock} aria-label="公開と共有画面の見本">
      <div className={styles.flowPublishPanel}>
        <strong className={styles.flowPublishDone}><span>✓</span>公開が完了しました！</strong>
        <div className={styles.flowPublishedUrl}><span>https://webbookmaker.app/books/123456</span><b>URLをコピー</b></div>
        <strong className={styles.flowShareLabel}>シェアする</strong>
        <div className={styles.flowShareServices}>
          <span><i className={styles.flowServiceX}><ServiceIcon service="x" /></i><small>X</small></span>
          <span><i className={styles.flowServiceNote}><ServiceIcon service="note" /></i><small>note</small></span>
          <span><i className={styles.flowServiceFacebook}><ServiceIcon service="facebook" /></i><small>Facebook</small></span>
          <span><i className={styles.flowServiceLine}><ServiceIcon service="line" /></i><small>LINE</small></span>
          <span><i className={styles.flowServiceQr}><QrCodeIcon /></i><small>QRコード</small></span>
        </div>
        <span className={styles.flowDetailToggle}>詳細設定を開く⌄</span>
      </div>
      <div className={styles.flowXPost}><XShareSampleCard compact /></div>
    </div>
  );
}

const analyticsBars = [44, 60, 68, 84, 58, 48];

function AnalyticsFlowMock() {
  return (
    <div className={styles.flowAnalyticsMock} aria-label="アクセス分析と作品管理画面の見本">
      <div className={styles.flowAnalyticsPanel}>
        <div className={styles.flowAnalyticsHeading}><strong>最近のアクセス</strong><small>過去7日間</small></div>
        <div className={styles.flowChart}>
          <div className={styles.flowYAxis}><span>400</span><span>300</span><span>200</span><span>100</span><span>0</span></div>
          <div className={styles.flowBars}>{analyticsBars.map((height, index) => <span key={index}><i style={{ height: `${height}%` }} /><small>{["5/6", "5/7", "5/8", "5/10", "5/11", "5/12"][index]}</small></span>)}</div>
        </div>
        <strong className={styles.flowPopularHeading}>人気のページ</strong>
        <div className={styles.flowPopularRow}><b>1</b><span>表紙</span><i><em style={{ width: "92%" }} /></i><strong>385</strong></div>
        <div className={styles.flowPopularRow}><b>2</b><span>第1章 はじまりの夜</span><i><em style={{ width: "64%" }} /></i><strong>256</strong></div>
      </div>
      <div className={styles.flowManagePanel}>
        {["作品を編集する", "表紙・テーマの変更", "Analyticsを見る", "読者の反応を確認", "複製して新しい本を作る"].map((item, index) => (
          <div key={item}><span aria-hidden="true">{["✎", "▣", "▥", "◇", "□"][index]}</span><strong>{item}</strong><b>›</b></div>
        ))}
      </div>
    </div>
  );
}

export default function Ver2HowItWorks() {
  return (
    <section className={styles.section} id="samples">
      <div className={styles.container}>
        <div className={styles.useCasesHeadingRow}>
          <h2 className={`${styles.sectionTitle} ${styles.withBookmark}`}>
            <span className={styles.bookmarkMark} aria-hidden="true">付箋</span>
            かんたん3ステップで、あなたの本が完成
          </h2>
          <Link className={styles.useCasesCta} href="/use-cases">
            詳しい活用例はこちら <span aria-hidden="true">→</span>
          </Link>
        </div>
        <p className={styles.sectionLead}>文章を貼り、表紙を選び、URLで届ける。迷わず進める制作フローです。</p>
        <div className={styles.steps}>
          <article className={styles.step}>
            <div className={styles.stepHead}><span className={styles.stepNum}>1</span><h3>文章を貼り付ける</h3></div>
            <EditorFlowMock />
          </article>
          <article className={styles.step}>
            <div className={styles.stepHead}><span className={styles.stepNum}>2</span><h3>表紙とテーマを選ぶ</h3></div>
            <CoverFlowMock />
          </article>
          <article className={styles.step}>
            <div className={styles.stepHead}><span className={styles.stepNum}>3</span><h3>公開して、読者へ届ける</h3></div>
            <ShareFlowMock />
          </article>
          <article className={styles.step}>
            <div className={styles.stepHead}><span className={styles.stepNum}>4</span><h3>公開後も作品を分析・編集</h3></div>
            <AnalyticsFlowMock />
          </article>
        </div>
      </div>
    </section>
  );
}
