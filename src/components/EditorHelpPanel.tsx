"use client";

import Link from "next/link";
import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";

import { commonHelpEntries } from "@/lib/editorGuidance/helpCatalog";
import { matchHelpIntent } from "@/lib/editorGuidance/helpMatcher";
import type { EditorHelpCatalogEntry } from "@/lib/editorGuidance/helpTypes";
import { getEditorHelpActionDefinition } from "@/lib/editorGuidance/actionRegistry";
import type { EditorNavigationResult } from "@/lib/editorGuidance/editorNavigation";
import { bookyQueryState, type BookyHelpQueryState } from "@/lib/editorGuidance/bookyHelp";
import { BookyHelpStatus } from "@/components/BookyHelp";

type EditorHelpPanelProps = {
  onClose: () => void;
  onAction: (entry: EditorHelpCatalogEntry) => EditorNavigationResult | Promise<EditorNavigationResult>;
  resolveRoute: (entry: EditorHelpCatalogEntry) => `/${string}` | undefined;
  onBookyStateChange: (state: BookyHelpQueryState) => void;
};

function ResultCard({
  entry,
  onAction,
  resolveRoute,
}: {
  entry: EditorHelpCatalogEntry;
  onAction: (entry: EditorHelpCatalogEntry) => void;
  resolveRoute: (entry: EditorHelpCatalogEntry) => `/${string}` | undefined;
}) {
  const action = getEditorHelpActionDefinition(entry.actionId);
  const route = resolveRoute(entry);
  return (
    <article className={`editor-help-result${entry.unsupported ? " is-unsupported" : ""}`}>
      <h3>{entry.title}</h3>
      <p>{entry.answer}</p>
      {action && !entry.unsupported ? (
        <button
          className="editor-help-action"
          type="button"
          aria-label={action.ariaLabel}
          onClick={() => onAction(entry)}
          onKeyDown={(event) => {
            if (event.key !== "Enter" && event.key !== " ") return;
            event.preventDefault();
            onAction(entry);
          }}
        >
          {action.buttonLabel}
        </button>
      ) : null}
      {route ? (
        <Link className="editor-help-route" href={route}>
          詳しく見る
          <span aria-hidden="true">→</span>
        </Link>
      ) : null}
    </article>
  );
}

export default function EditorHelpPanel({ onClose, onAction, resolveRoute, onBookyStateChange }: EditorHelpPanelProps) {
  const [query, setQuery] = useState("");
  const [actionMessage, setActionMessage] = useState("");
  const deferredQuery = useDeferredValue(query);
  const panelRef = useRef<HTMLElement | null>(null);
  const searchRef = useRef<HTMLInputElement | null>(null);
  const result = useMemo(() => matchHelpIntent(deferredQuery), [deferredQuery]);
  const commonEntries = useMemo(() => commonHelpEntries(), []);
  const isInitial = !deferredQuery.trim();
  const currentBookyState = useMemo(
    () => bookyQueryState(!isInitial, result.kind),
    [isInitial, result.kind],
  );

  useEffect(() => {
    onBookyStateChange(currentBookyState);
  }, [currentBookyState, onBookyStateChange]);

  useEffect(() => {
    searchRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== "Tab" || !panelRef.current) return;
      const focusable = Array.from(
        panelRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), a[href], input:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      );
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const handleAction = async (entry: EditorHelpCatalogEntry) => {
    setActionMessage("");
    const status = await onAction(entry);
    if (status === "handled") return;
    setActionMessage(
      status === "not-found"
        ? "対象箇所は現在の作品内に見つかりません。"
        : "現在の状態では、この操作場所を開けません。",
    );
  };

  return (
    <div
      className="editor-help-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        ref={panelRef}
        className="editor-help-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="editor-help-title"
      >
        <header className="editor-help-header">
          <div>
            <p className="maker-kicker">Editor Help</p>
            <h2 id="editor-help-title">やりたい操作を検索</h2>
          </div>
          <button className="editor-help-close" type="button" onClick={onClose} aria-label="ヘルプを閉じる">
            ×
          </button>
        </header>

        <BookyHelpStatus state={currentBookyState} />

        <label className="editor-help-search">
          <span>操作を検索</span>
          <input
            ref={searchRef}
            type="search"
            value={query}
            placeholder="やりたいことを入力してください"
            autoComplete="off"
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
        {actionMessage ? <p className="editor-help-action-message" role="status">{actionMessage}</p> : null}

        {isInitial ? (
          <div className="editor-help-initial">
            <h3>よく使う操作</h3>
            <div className="editor-help-chips">
              {commonEntries.map((entry) => (
                <button key={entry.intent} type="button" onClick={() => setQuery(entry.phrases[0])}>
                  {entry.title}
                </button>
              ))}
            </div>
            <p>質問はこのブラウザ内だけで照合され、送信・保存されません。</p>
          </div>
        ) : result.kind === "answer" ? (
          <div className="editor-help-results" aria-live="polite">
            <p className="editor-help-result-label">該当する案内</p>
            <ResultCard entry={result.entry} onAction={(entry) => void handleAction(entry)} resolveRoute={resolveRoute} />
          </div>
        ) : result.kind === "ambiguous" ? (
          <div className="editor-help-results" aria-live="polite">
            <p className="editor-help-result-label">次のどれについて知りたいですか？</p>
            {result.entries.map((entry) => <ResultCard key={entry.intent} entry={entry} onAction={(candidate) => void handleAction(candidate)} resolveRoute={resolveRoute} />)}
          </div>
        ) : (
          <div className="editor-help-results" aria-live="polite">
            <p className="editor-help-result-label">その操作については、次のようなことを聞いてみてください。</p>
            <div className="editor-help-chips">
              {result.entries.map((entry) => (
                <button key={entry.intent} type="button" onClick={() => setQuery(entry.phrases[0])}>
                  {entry.title}
                </button>
              ))}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
