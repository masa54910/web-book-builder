"use client";

import type { ReactNode } from "react";

import Button from "./Button";
import StatusMessage from "./StatusMessage";

type AttachedFileSummary = {
  name: string;
  size: number;
  fingerprint: string;
};

type Props = {
  accept: string;
  disabled?: boolean;
  isLoading?: boolean;
  files: AttachedFileSummary[];
  onPick: (file: File | null) => void;
  onDropFile?: (file: File) => void;
  onRemove: (fingerprint: string) => void;
  status?: string;
  renderMeta?: (file: AttachedFileSummary) => ReactNode;
};

export default function FileUploadField({
  accept,
  disabled,
  isLoading,
  files,
  onPick,
  onDropFile,
  onRemove,
  status,
  renderMeta,
}: Props) {
  return (
    <div
      onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => {
        event.preventDefault();
        const file = event.dataTransfer.files?.[0];
        if (file && onDropFile) onDropFile(file);
      }}
    >
      <input
        type="file"
        accept={accept}
        disabled={disabled}
        onChange={(event) => {
          onPick(event.target.files?.[0] ?? null);
          event.currentTarget.value = "";
        }}
      />
      {files.length ? (
        <div aria-label="添付済みファイル">
          {files.map((file) => (
            <p key={file.fingerprint}>
              {file.name} {renderMeta ? renderMeta(file) : null}
              <Button variant="ghost" size="sm" onClick={() => onRemove(file.fingerprint)}>解除</Button>
            </p>
          ))}
        </div>
      ) : null}
      {isLoading ? <StatusMessage variant="info" message="ファイルを読み込み中です…" /> : null}
      {status ? <StatusMessage variant={status.includes("失敗") ? "error" : "success"} message={status} /> : null}
    </div>
  );
}
