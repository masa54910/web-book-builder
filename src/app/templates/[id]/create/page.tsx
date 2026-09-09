import { notFound } from "next/navigation";
import ProtectedRoute from "@/components/ProtectedRoute";
import CreateTemplateBook from "@/components/CreateTemplateBook";
import HomeBackLink from "@/components/HomeBackLink";
import Ver2Header from "@/components/ver2/lp/Ver2Header";
import { getBookTemplate } from "@/lib/templateCatalog";
import styles from "@/components/TemplateCatalog.module.css";
export const metadata = { title: "テンプレートから作成 | WebBookMaker", robots: { index: false, follow: false } };
export default async function CreateTemplatePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const template = getBookTemplate(id);
  if (!template) notFound();
  return <ProtectedRoute><div className={styles.page}><Ver2Header /><main className={styles.container}><HomeBackLink destination="dashboard" /><CreateTemplateBook key={id} templateId={id} name={template.name} /></main></div></ProtectedRoute>;
}
