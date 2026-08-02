# Deployment notes

このリポジトリでは、今回の作業中にGitHub push、Vercel link、Vercel deployを行っていません。

## 推奨手順

1. GitHubで `web-book-builder` 専用リポジトリを作成
2. 元作品とは別remoteとして設定
3. Supabase専用プロジェクトを作成
4. migrationを適用
5. Vercelで新規Projectを作成
6. 環境変数を設定
7. Preview Deploymentで認証・保存・公開URLを検証
8. 限定ベータではPreview URLだけを共有

今回の限定ベータ工程ではProduction Deploymentは禁止です。

## Build command

```bash
npm run build
```

## Output

Next.js標準出力です。`output: "export"` は使用していません。`/books/[slug]` の公開URLを動的に扱うためです。

## 本番前チェック

- `NEXT_PUBLIC_APP_ENV=preview`
- `NEXT_PUBLIC_ENABLE_DEMO_MODE=false`
- Preview環境のrobots/noindex
- Supabase Authのメールテンプレート・リダイレクトURL
- Supabase Auth Site URL / Redirect URL に以下を登録
	- `http://localhost:3001`
	- Vercel Preview URL
	- Vercel Production URL
	- reset-password callback URL（`/auth/callback`）
- RLS policy
- Storage policy
- 利用規約 / プライバシーポリシー本文の正式化
- 問い合わせ先
- 404 / abuse report / takedown flow

## Gate5 デプロイ確認ルート

- `/pricing`
- `/signup`
- `/settings`
- `/analytics`
- `/analytics/[bookId]`
- `/dashboard`
- `/books/new`
- `/books/[slug]`

## 認証429発生時の対応

1. Supabase AuthのRate Limit設定を確認
2. 確認メール必須設定の有無を確認
3. 既存検証アカウントでログイン検証へ切り替える
4. 新規アカウント連続作成でのE2E再試行を止める
