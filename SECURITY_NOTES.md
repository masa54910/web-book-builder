# Security notes

## 実装済み

- 原稿や設定値をHTMLとして直接挿入しない
- `dangerouslySetInnerHTML` 不使用
- URL表示はテキストとして扱う
- `javascript:` URLはリンク化しない既存レンダリング
- 外部リンクは保存時/表示時に `https://` を優先し、危険scheme・認証情報入りURL・制御文字を拒否
- 画像はJPEG / PNG / WebPのみ
- SVGは拒否
- ZIP Slip対策
- 入れ子ZIP、実行可能拡張子を拒否
- localStorage / IndexedDBの壊れたJSONを無視
- Preview/ProductionでSupabase未設定ならデモ保存へフォールバックしない
- Preview環境はrobots/metadataでnoindex

## 残課題

- Supabase Storage署名URLの有効期限とキャッシュ最適化
- abuse report / takedown導線
- 管理者画面
- rate limit
- 監査ログ
- paid / members / password accessの実装

## npm audit

`npm audit` は現時点でNext.js / postcss / sharp / eslint系のhigh advisoryを報告します。安定版Next.jsは現在の `16.2.12` が最新で、`npm audit fix --force` は破壊的更新の可能性があるため未実行です。現行アプリは `next/image` を使わず、ユーザー入力CSSをPostCSSへ渡さないため、限定ベータの通常操作からの到達可能性は低いと評価しています。
