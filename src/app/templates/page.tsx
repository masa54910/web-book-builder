import type { Metadata } from "next";
import HomeBackLink from "@/components/HomeBackLink";
import TemplateCatalog from "@/components/TemplateCatalog";
import Ver2Header from "@/components/ver2/lp/Ver2Header";
import Ver2Footer from "@/components/ver2/lp/Ver2Footer";
import styles from "@/components/TemplateCatalog.module.css";

export const metadata: Metadata = { title: "サンプルとテンプレート | WebBookMaker", description: "9つの完成サンプルを読み、あなたの一冊に合うテンプレートを選べます。", alternates: { canonical: "https://webbookmaker.vercel.app/templates" } };
export default function TemplatesPage() {
  return <div className={styles.page}><Ver2Header /><main className={styles.container}><HomeBackLink /><section className={styles.hero}><p>SAMPLE & TEMPLATE BOOKS</p><h1>次の一冊を、ここから。</h1><p>まずは完成サンプルをめくってみてください。気に入った形式を選ぶと、編集しやすい文章と図版を備えた、あなた専用の新しい作品を作れます。</p></section><TemplateCatalog /></main><Ver2Footer /></div>;
}
