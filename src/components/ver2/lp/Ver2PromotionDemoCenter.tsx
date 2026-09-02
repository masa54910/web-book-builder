import Image from "next/image";
import Link from "next/link";

import { SAMPLE_BOOK_COVER_IMAGE } from "@/lib/sampleBookConstants";
import styles from "./Ver2Landing.module.css";
import { NoteShareSampleCard, XShareSampleCard } from "./HomeShareSamples";

function AuthorProfileMiniPreview() {
  const works = [
    { title: "星降る街の小さな記録", image: SAMPLE_BOOK_COVER_IMAGE },
    { title: "風見鶏の灯台", image: "/sample-images/hoshifuru-01.webp" },
    { title: "月明かりの停留所", image: "/sample-images/hoshifuru-02.webp" },
  ];

  return (
    <div className={`${styles.promoPreview} ${styles.authorProfileMini}`} aria-label="作者プロフィールページの見本">
      <div className={styles.authorProfileMiniHeader}>
        <span className={styles.authorProfileMiniAvatar}>
          A
        </span>
        <div>
          <strong>本野しおり（サンプル作者）</strong>
          <small>@webbookmaker</small>
        </div>
      </div>
      <p className={styles.authorProfileMiniBio}>夜の街と小さな灯りをテーマに、短編を制作しています。</p>
      <div className={styles.authorProfileMiniWorks}>
        <div className={styles.authorProfileMiniWorksHeading}><strong>公開作品</strong><small>3冊</small></div>
        <div className={styles.authorProfileMiniWorkGrid}>
          {works.map((work) => (
            <div className={styles.authorProfileMiniWork} key={work.title}>
              <span className={styles.authorProfileMiniThumb}>
                <Image src={work.image} alt="" fill sizes="72px" />
              </span>
              <strong>{work.title}</strong>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function Ver2PromotionDemoCenter() {
  return (
    <section className={styles.promotionSection} id="promotion">
      <div className={styles.container}>
        <div className={styles.useCasesHeadingRow}>
          <h2 className={`${styles.promoTitle} ${styles.withBookmark}`}>
            <span className={styles.bookmarkMark} aria-hidden="true">付箋</span>
            公開後も、作品を編集・改善しながら広めよう
          </h2>
          <Link className={styles.useCasesCta} href="/use-cases">
            詳しい活用例はこちら <span aria-hidden="true">→</span>
          </Link>
        </div>
        <p className={styles.sectionLead}>公開して終わりではなく、読者に届く導線までひとつの体験にまとめます。</p>
        <div className={styles.promotionScenario}>
          <div className={`${styles.promoCopy} ${styles.sectionLead}`}>
            <h3>私、こういうの作ったんですよ。見てもらえますか？</h3>
            <p>
              URLで送る。QRで渡す。<br />
              相手はスマホで、その場ですぐ読めます。
            </p>
            <p><strong>名刺代わりに。あなたという人の“アイコン”代わりに。</strong></p>
            <p><strong>まずは、自分を表すWebブックを1冊持っておく。</strong></p>
            <p>
              WebBookMakerには作者プロフィールと作品一覧もあります。
              一冊を読んでもらったあと、あなた自身や、ほかの作品へつなげることもできます。
            </p>
          </div>
          <div className={styles.promotionScenarioVisual}>
            <Image
              src="/home/webbook-delivery-online-offline.png"
              alt="QRコードからWebブックをその場で見てもらうイメージ"
              width={1448}
              height={1086}
              sizes="(max-width: 640px) calc(100vw - 48px), (max-width: 820px) calc(100vw - 64px), 42vw"
            />
          </div>
        </div>
        <div className={styles.promoGrid}>
          <article className={`${styles.promo} ${styles.adjustmentCard}`}>
            <div className={styles.promoCopy}>
              <span className={styles.promoLabel}>Previewで仕上げる</span>
              <h3>仕上がりを見ながら、かんたん調整</h3>
              <p>表紙のレイアウトや文字サイズ、本文の改ページや画像配置も、プレビューを見ながら調整できます。</p>
              <small className={styles.adjustmentSubcopy}>自動で作って、気になるところだけ整える。</small>
            </div>
            <div className={`${styles.promoPreview} ${styles.adjustmentPreview}`} aria-hidden="true">
              <div className={styles.adjustmentPreviewToolbar}>
                <span className={styles.adjustmentPreviewKicker}>Preview</span>
                <span className={styles.adjustmentPreviewPageCount}>2 / 22</span>
              </div>
              <div className={styles.adjustmentPreviewSpread}>
                <div className={`${styles.adjustmentPreviewPage} ${styles.adjustmentPreviewPageLeft}`}>
                  <span className={styles.adjustmentPreviewBrand}>WebBookMaker</span>
                  <strong>星降る街の<br />小さな記録</strong>
                  <span className={styles.adjustmentPreviewRule} />
                  <div className={styles.adjustmentPreviewBody}>
                    <span>夜の街で見つけた光を、</span>
                    <span>小さな記録にまとめました。</span>
                    <span>ページをめくるたび、</span>
                    <span>物語がゆっくり広がります。</span>
                  </div>
                  <span className={styles.adjustmentPreviewImageFrame}>
                    <Image src={SAMPLE_BOOK_COVER_IMAGE} alt="" fill sizes="220px" />
                  </span>
                  <span className={styles.adjustmentPreviewFolio}>01</span>
                </div>
                <aside className={styles.adjustmentPreviewModal}>
                  <div className={styles.adjustmentPreviewModalHeader}>
                    <strong>ページ調整</strong>
                    <span aria-hidden="true">×</span>
                  </div>
                  <small className={styles.adjustmentPreviewModalMeta}>Page 2 / 22</small>
                  <span className={styles.adjustmentPreviewModalSection}>本文レイアウト</span>
                  <div className={styles.adjustmentPreviewModalControl}><span>改ページ</span><b>追加</b></div>
                  <div className={styles.adjustmentPreviewModalControl}><span>画像サイズ</span><b>本文幅</b></div>
                  <div className={styles.adjustmentPreviewModalControl}><span>画像配置</span><b>中央</b></div>
                  <div className={styles.adjustmentPreviewModalControl}><span>余白</span><b>標準</b></div>
                  <span className={styles.adjustmentPreviewModalReset}>自動に戻す</span>
                </aside>
              </div>
              <div className={styles.adjustmentPreviewFooter}>
                <span>表紙を調整</span>
                <span>ページを調整</span>
              </div>
            </div>
          </article>
          <article className={`${styles.promo} ${styles.xCard}`}>
            <div className={styles.promoCopy}><span className={styles.promoLabel}>SNSで共有</span><h3>X共有テンプレート</h3><p>タイトル・紹介文・ハッシュタグを自動生成。投稿前に確認して、そのまま共有できます。</p><ul className={styles.promoChecks}><li>作品紹介文を自動生成</li><li>ハッシュタグを自動提案</li><li>投稿文をワンクリックでコピー</li></ul></div>
            <div className={styles.promoPreview}><XShareSampleCard /></div>
            <Link className={`${styles.promoCta} ${styles.xCta}`} href="/demo/x">X投稿の見本</Link>
          </article>
          <article className={`${styles.promo} ${styles.noteCard}`}>
            <div className={styles.promoCopy}><span className={styles.promoLabel}>記事で広げる</span><h3>note記事テンプレート</h3><p>作品に込めた想いや制作背景を、読みやすいnote記事として紹介できます。</p><ul className={styles.promoChecks}><li>記事構成を自動で用意</li><li>作品URLを自然に挿入</li><li>自分の言葉で自由に編集</li></ul></div>
            <div className={styles.promoPreview}><NoteShareSampleCard /></div>
            <Link className={`${styles.promoCta} ${styles.noteCta}`} href="/demo/note">note記事の見本</Link>
          </article>
          <article className={`${styles.promo} ${styles.portfolioCard}`}>
            <div className={styles.promoCopy}><span className={styles.promoLabel}>作品棚を育てる</span><h3>作者のポートフォリオにも</h3><p>公開作品を作者ページにまとめて、自分だけの作品棚として読者へ見せられます。</p><ul className={styles.promoChecks}><li>作品一覧を自動表示</li><li>プロフィールとSNSを掲載</li><li>次の作品へ自然に誘導</li></ul></div>
            <AuthorProfileMiniPreview />
            <Link className={`${styles.promoCta} ${styles.portfolioCta}`} href="/demo/author">作者ページを見る →</Link>
          </article>
        </div>
      </div>
    </section>
  );
}
