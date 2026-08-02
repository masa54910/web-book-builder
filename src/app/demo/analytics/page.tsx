import DemoTopActions from "@/components/demo/DemoTopActions";
import styles from "@/components/demo/DemoPages.module.css";

const hourly = [
  { label: "07:00", value: 12 },
  { label: "12:00", value: 38 },
  { label: "18:00", value: 72 },
  { label: "22:00", value: 91 },
];

export default function DemoAnalyticsPage() {
  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <DemoTopActions />
        <section className={styles.hero}>
          <p className={styles.kicker}>Demo Analytics</p>
          <h1 className={styles.title}>分析レポート見本</h1>
          <p className={styles.lead}>この画面はデモデータです。PV、読了率、人気ページ、離脱ページ、流入元、時間帯を公開前に確認できます。</p>
        </section>

        <section className={styles.statsGrid}>
          <article className={styles.statCard}><h3>PV</h3><p className={styles.statValue}>12,840</p></article>
          <article className={styles.statCard}><h3>読了率</h3><p className={styles.statValue}>63%</p></article>
          <article className={styles.statCard}><h3>人気ページ</h3><p className={styles.statValue}>第2章</p></article>
          <article className={styles.statCard}><h3>離脱ページ</h3><p className={styles.statValue}>第1章終盤</p></article>
        </section>

        <section className={styles.channelGrid}>
          <article className={styles.channelCard}><h3>流入元 X</h3><p>38%</p></article>
          <article className={styles.channelCard}><h3>流入元 note</h3><p>27%</p></article>
          <article className={styles.channelCard}><h3>流入元 LINE</h3><p>19%</p></article>
        </section>

        <article className={styles.timeline}>
          <h3>時間帯アクセス</h3>
          <div className={styles.chart}>
            {hourly.map((item) => (
              <div className={styles.barRow} key={item.label}>
                <span>{item.label}</span>
                <div className={styles.bar} style={{ width: `${item.value}%` }} />
                <strong>{item.value}</strong>
              </div>
            ))}
          </div>
        </article>
      </div>
    </main>
  );
}
