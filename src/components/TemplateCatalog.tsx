import Image from "next/image";
import Button from "@/components/ui/Button";
import GlassCard from "@/components/ui/GlassCard";
import { BOOK_TEMPLATES } from "@/lib/templateCatalog";
import styles from "./TemplateCatalog.module.css";

export default function TemplateCatalog() {
  return <div className={styles.grid}>
    {BOOK_TEMPLATES.map((template, index) => <GlassCard as="article" key={template.id} className={styles.card} padding="lg">
      <div className={styles.cover}><Image src={template.thumbnail} alt={`${template.name}の表紙図版`} width={900} height={1200} sizes="(max-width: 640px) 85vw, (max-width: 1000px) 42vw, 300px" priority={index < 3} /></div>
      <p className={styles.category}>{String(index + 1).padStart(2, "0")} / {template.category}</p>
      <h2>{template.name}</h2><p className={styles.description}>{template.description}</p>
      <div className={styles.actions}><Button href={`/sample/${template.slug}`} variant="secondary">サンプルを見る</Button><Button href={`/templates/${template.id}/create`}>このテンプレートで作る</Button></div>
    </GlassCard>)}
  </div>;
}
