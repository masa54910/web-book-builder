import Image from "next/image";
import Link from "next/link";

import { SAMPLE_BOOK_COVER_IMAGE } from "@/lib/sampleBookConstants";
import styles from "./Ver2Landing.module.css";
import { NoteShareSampleCard, XShareSampleCard } from "./HomeShareSamples";

export default function Ver2PromotionDemoCenter() {
  return (
    <section className={styles.promotionSection} id="promotion">
      <div className={styles.container}>
        <h2 className={`${styles.promoTitle} ${styles.withBookmark}`}>
          <span className={styles.bookmarkMark} aria-hidden="true">付箋</span>
          公開後も、作品を編集・改善しながら広めよう
        </h2>
        <p className={styles.sectionLead}>公開して終わりではなく、読者に届く導線までひとつの体験にまとめます。</p>
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
                  <span className={styles.adjustmentPreviewLine} />
                  <span className={styles.adjustmentPreviewLineShort} />
                  <span className={styles.adjustmentPreviewFolio}>01</span>
                </div>
                <span className={styles.adjustmentPreviewSpine} />
                <div className={`${styles.adjustmentPreviewPage} ${styles.adjustmentPreviewPageRight}`}>
                  <span className={styles.adjustmentPreviewPageKicker}>Chapter 1</span>
                  <strong>夜の街で見つけた光</strong>
                  <p>小さな出来事を、1冊のWebブックに。</p>
                  <span className={styles.adjustmentPreviewImageFrame}>
                    <Image src={SAMPLE_BOOK_COVER_IMAGE} alt="" fill sizes="220px" />
                  </span>
                  <span className={styles.adjustmentPreviewFolio}>02</span>
                </div>
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
            <div className={`${styles.promoPreview} ${styles.shelfPreview}`}><div className={styles.shelfBooks}><i /><i /><i /><i /></div><div className={styles.shelfBoard} /><div className={styles.authorCardMini}><span>A</span><div><strong>あなたの作者ページ</strong><small>公開作品 4冊</small></div></div></div>
            <Link className={`${styles.promoCta} ${styles.portfolioCta}`} href="/demo/author">作者ページを見る →</Link>
          </article>
        </div>
      </div>
    </section>
  );
}
