"use client";
import { useEffect, useRef } from "react";
import BookReader from "@/components/BookReader";
import Button from "@/components/ui/Button";
import type { BookProject } from "@/lib/bookProject";

/** Local-only preview. No save/publish command or OpenAI call is made here. */
export default function FullDesignReaderPreview({ project, onClose }: { project: BookProject; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => { ref.current?.showModal(); }, []);
  return <dialog ref={ref} className="full-design-reader-dialog" onCancel={onClose} aria-label="フルデザインの仮プレビュー">
    <div className="maker-actions"><strong>仮プレビュー · 保存内容は変更されていません</strong><Button type="button" variant="secondary" onClick={onClose}>Editorへ戻る</Button></div>
    <BookReader config={project.config} chapters={project.chapters} images={project.images} contentBlocks={project.contentBlocks} displayMode="preview" />
  </dialog>;
}
