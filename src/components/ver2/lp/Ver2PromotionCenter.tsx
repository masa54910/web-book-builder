import styles from "./Ver2Landing.module.css";

export default function Ver2PromotionCenter() {
  return (
    <section className={styles.promotionSection} id="promotion">
      <div className={styles.container}>
        <h2 className={styles.promoTitle}>公開したあと、作品をもっと広めよう</h2>
        <p className={styles.sectionLead}>公開して終わりではなく、読者に届く導線までひとつの体験にまとめます。</p>
        <div className={styles.promoGrid}>
          <article className={`${styles.promo} ${styles.videoCard}`}>
            <div className={styles.promoCopy}><span className={styles.promoLabel}>動画で伝える</span><h3>紹介動画を作成</h3><p>作品の魅力を動画で伝えましょう。YouTubeやSNSへ、そのまま紹介できます。</p><ul className={styles.promoChecks}><li>表紙と本文を自動で映像化</li><li>BGM・ナレーションに対応</li><li>ワンクリックで書き出し</li></ul></div>
            <div className={`${styles.promoPreview} ${styles.videoPreview}`}><div className={styles.videoScreen}><div className={styles.videoBook} /><span className={styles.playButton}>▶</span></div></div>
            <a className={`${styles.promoCta} ${styles.videoCta}`} href="/signup?next=%2Fdashboard">動画を作る →</a>
          </article>
          <article className={`${styles.promo} ${styles.xCard}`}>
            <div className={styles.promoCopy}><span className={styles.promoLabel}>SNSで共有</span><h3>X共有テンプレート</h3><p>タイトル・紹介文・ハッシュタグを自動生成。投稿前に確認して、そのまま共有できます。</p><ul className={styles.promoChecks}><li>作品紹介文を自動生成</li><li>ハッシュタグを自動提案</li><li>投稿文をワンクリックでコピー</li></ul></div>
            <div className={`${styles.promoPreview} ${styles.postPreview}`}><div className={styles.postAvatar}>W</div><div className={styles.postBody}><strong>WebBookMaker</strong><small>@webbookmaker</small><p>新作『星降る街の小さな記録』を公開しました。</p><span>#WebBookMaker #Web小説</span><div className={styles.postCover} /></div></div>
            <a className={`${styles.promoCta} ${styles.xCta}`} href="/signup?next=%2Fdashboard">Xで共有する →</a>
          </article>
          <article className={`${styles.promo} ${styles.noteCard}`}>
            <div className={styles.promoCopy}><span className={styles.promoLabel}>記事で広げる</span><h3>note記事テンプレート</h3><p>作品に込めた想いや制作背景を、読みやすいnote記事として紹介できます。</p><ul className={styles.promoChecks}><li>記事構成を自動で用意</li><li>作品URLを自然に挿入</li><li>自分の言葉で自由に編集</li></ul></div>
            <div className={`${styles.promoPreview} ${styles.notePreview}`}><span className={styles.noteBadge}>note</span><h4>新作『星降る街の小さな記録』を公開しました。</h4><div className={styles.noteLines}><i /><i /><i /></div><div className={styles.noteCover} /></div>
            <a className={`${styles.promoCta} ${styles.noteCta}`} href="/signup?next=%2Fdashboard">note記事を作る →</a>
          </article>
          <article className={`${styles.promo} ${styles.portfolioCard}`}>
            <div className={styles.promoCopy}><span className={styles.promoLabel}>作品棚を育てる</span><h3>作者のポートフォリオにも</h3><p>公開作品を作者ページにまとめて、自分だけの作品棚として読者へ見せられます。</p><ul className={styles.promoChecks}><li>作品一覧を自動表示</li><li>プロフィールとSNSを掲載</li><li>次の作品へ自然に誘導</li></ul></div>
            <div className={`${styles.promoPreview} ${styles.shelfPreview}`}><div className={styles.shelfBooks}><i /><i /><i /><i /></div><div className={styles.shelfBoard} /><div className={styles.authorCardMini}><span>A</span><div><strong>あなたの作者ページ</strong><small>公開作品 4冊</small></div></div></div>
            <a className={`${styles.promoCta} ${styles.portfolioCta}`} href="/signup?next=%2Fdashboard">作者ページを見る →</a>
          </article>
        </div>
      </div>
    </section>
  );
}
