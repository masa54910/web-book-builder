"use client";

import Image from "next/image";
import type { RefObject } from "react";

import {
  BOOKY_HELP_PRESENTATIONS,
  type BookyHelpState,
} from "@/lib/editorGuidance/bookyHelp";

export function BookyHelpTrigger({
  buttonRef,
  state,
  expanded,
  onOpen,
}: {
  buttonRef: RefObject<HTMLButtonElement | null>;
  state: BookyHelpState;
  expanded: boolean;
  onOpen: () => void;
}) {
  const presentation = BOOKY_HELP_PRESENTATIONS[state];
  return (
    <button
      ref={buttonRef}
      className={`booky-help-trigger is-${state}${expanded ? " is-open" : ""}`}
      type="button"
      aria-label="WebBookMakerのヘルプを開く"
      aria-haspopup="dialog"
      aria-expanded={expanded}
      onClick={onOpen}
      onKeyDown={(event) => {
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        onOpen();
      }}
    >
      <span className="booky-help-bubble" aria-hidden="true">{presentation.message}</span>
      <span className="booky-help-avatar" aria-hidden="true">
        <Image src={presentation.imageSrc} alt="" width={256} height={256} sizes="80px" />
      </span>
    </button>
  );
}

export function BookyHelpStatus({ state }: { state: BookyHelpState }) {
  const presentation = BOOKY_HELP_PRESENTATIONS[state];
  return (
    <div className={`booky-help-status is-${state}`} aria-live="polite">
      <span className="booky-help-status-avatar" aria-hidden="true">
        <Image src={presentation.imageSrc} alt="" width={256} height={256} sizes="56px" />
      </span>
      <span>
        <strong>ブッキー</strong>
        <span>{presentation.message}</span>
      </span>
    </div>
  );
}
