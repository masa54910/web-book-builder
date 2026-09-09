import type { Metadata } from "next";
import { notFound } from "next/navigation";
import BookReaderShell from "@/components/BookReaderShell";
import Button from "@/components/ui/Button";
import { BOOK_TEMPLATES, getBookTemplate } from "@/lib/templateCatalog";
import { loadCatalogSample } from "@/lib/templateBooks";
import styles from "@/components/TemplateCatalog.module.css";

export function generateStaticParams() { return BOOK_TEMPLATES.map(({ slug }) => ({ slug })); }
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const template = getBookTemplate(slug);
  if (!template) return {};
  const url = `https://webbookmaker.vercel.app/sample/${template.slug}`;
  return { title: `${template.name} | サンプル | WebBookMaker`, description: template.description, alternates: { canonical: url }, openGraph: { title: template.name, description: template.description, url, images: [{ url: `https://webbookmaker.vercel.app${template.coverImage}`, width: 900, height: 1200 }] }, twitter: { card: "summary_large_image", title: template.name, images: [`https://webbookmaker.vercel.app${template.coverImage}`] } };
}
export default async function CatalogSamplePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const template = getBookTemplate(slug);
  if (!template) notFound();
  const sample = loadCatalogSample(template.id);
  return <><nav aria-label="サンプルブック" className={styles.sampleActions}><Button href="/templates" variant="secondary" size="sm">サンプル一覧へ</Button><Button href={`/templates/${template.id}/create`} size="sm">このテンプレートで作る</Button></nav><BookReaderShell config={sample.config} chapters={sample.chapters} images={sample.images} contentBlocks={sample.contentBlocks} sampleBookPresentation access={{ state: "free" }} shareUrl={`https://webbookmaker.vercel.app/sample/${template.slug}`} backLink={{ href: "/templates", label: "サンプル一覧へ" }} /></>;
}
