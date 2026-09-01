import type { ReactNode } from "react";

import type { EditorGuidanceIssue, EditorGuidanceSummary } from "@/lib/editorGuidance/types";
import { actionDefinitionForIssueId } from "@/lib/editorGuidance/actionRegistry";

export default function EditorGuidanceCard({
  id,
  summary,
  issues,
  className = "",
  embedded = false,
  onIssueAction,
  children,
}: {
  id: string;
  summary: EditorGuidanceSummary;
  issues: readonly EditorGuidanceIssue[];
  className?: string;
  embedded?: boolean;
  onIssueAction?: (issue: EditorGuidanceIssue) => void;
  children?: ReactNode;
}) {
  return (
    <section
      className={`${embedded ? "editor-guidance-card is-embedded" : "maker-card editor-guidance-card"} ${className}`.trim()}
      aria-labelledby={`${id}-title`}
    >
      <div className="editor-guidance-heading">
        <h2 id={`${id}-title`}>原稿を確認しました</h2>
        <span className="editor-guidance-paywall-state">
          有料境界：{summary.hasPaywall ? "あり" : "なし"}
        </span>
      </div>
      <dl className="editor-guidance-metrics" aria-label="原稿の概要">
        <div><dt>文字</dt><dd>{summary.characterCount.toLocaleString("ja-JP")}</dd></div>
        <div><dt>章</dt><dd>{summary.chapterCount}</dd></div>
        <div><dt>見出し</dt><dd>{summary.headingCount}</dd></div>
        <div><dt>ページ</dt><dd>{summary.pageCount}</dd></div>
      </dl>
      <p className="editor-guidance-media-counts">
        画像 {summary.imageCount}　動画 {summary.youtubeCount}
      </p>
      {issues.length ? (
        <div className="editor-guidance-issues" aria-labelledby={`${id}-issues-title`}>
          <h3 id={`${id}-issues-title`}>確認ポイント</h3>
          <ul>
            {issues.map((issue) => {
              const action = actionDefinitionForIssueId(issue.actionId, issue.id);
              return (
                <li key={`${issue.id}:${issue.sourceBlockId || issue.readerPageId || "book"}`} className={`severity-${issue.severity}`}>
                  <span aria-hidden="true">{issue.severity === "warning" ? "⚠" : issue.severity === "suggestion" ? "💡" : "ℹ"}</span>
                  <span className="editor-guidance-issue-content">
                    <span>{issue.message}</span>
                    {action && onIssueAction ? (
                      <button
                        className="editor-guidance-action"
                        type="button"
                        aria-label={action.ariaLabel}
                        onClick={() => onIssueAction(issue)}
                      >
                        {action.buttonLabel}
                      </button>
                    ) : null}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
      {children ? <div className="editor-guidance-status-note">{children}</div> : null}
    </section>
  );
}
