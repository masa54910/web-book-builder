import styles from "./Ver2Landing.module.css";

export default function Ver2Footer() {
  return (
    <footer className={styles.footer} id="help">
      <div className={`${styles.container} ${styles.footerRow}`}>
        <div><strong>WebBookMaker</strong><br /><small>あなたの文章を、そのままWeb書籍に。</small></div>
        <div className={styles.footerLinks}><a href="#howto">作り方</a><a href="#samples">サンプル</a><a href="#pricing">料金プラン</a><a href="#promotion">作品を広める</a><a href="#faq">よくある質問</a><a href="/terms">利用規約</a><a href="/privacy">プライバシー</a></div>
        <div className={styles.footerIcons}><span>𝕏</span><span>◎</span><span>LINE</span><span>✉</span></div>
      </div>
      <div className={styles.copy}>© 2026 WebBookMaker All rights reserved.</div>
    </footer>
  );
}
