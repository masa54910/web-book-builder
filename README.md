# WebBookMaker beta

WebBookMakerは、ユーザーが自分の原稿からページめくり付きWeb作品を作成・保存・公開できるNext.jsベータ版です。

コンセプトは「電子書籍を作るサービス」ではなく、「書いた文章を、読者へ届くWeb作品へ変えるサービス」です。

このプロジェクトは `trade-for-life-digital-novel` から分離された独立プロジェクトです。元作品の本文、画像、GitHub履歴、Vercel本番環境には依存しません。

## 主な機能

- 登録 / ログイン（ローカル開発のみデモ認証可。Preview/ProductionはSupabase必須）
- マイライブラリ
- 作品の作成、編集、保存、複製、ソフト削除
- 公開 / 限定公開 / 非公開
- `/books/[slug]` 形式の公開読書ページ
- `/authors/[handle]` 形式の作者ページ
- TXT / Markdown / Word `.docx` / ZIP原稿入力
- 表紙画像、本文画像、`[[image:画像ID]]` 挿入記法
- 右綴じ / 左綴じ、PC見開き、スマホ単ページ
- 目次ジャンプ、ページジャンプ、付箋、続きから読む
- 参考URLの選択・コピー
- SNS共有、URLコピー
- 外部販売/関連リンク表示
- ローカル閲覧解析と、公開作品向けSupabaseイベント集約
- 静的サンプル作品 `/sample`

## ベータ制限

- 1ユーザー最大5作品
- 1作品20万文字まで
- 画像30枚まで
- 画像1枚10MBまで
- ZIP 50MB、展開後100MB、200ファイルまで

## ローカル起動

```bash
npm install
npm run dev -- --port 3001
```

## 検証

```bash
npm run lint
npm run verify:book
npm test
npm run build
npm audit
```

## 環境変数

`.env.example` を `.env.local` にコピーし、Supabase利用時に設定します。

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_SITE_URL=http://localhost:3001
NEXT_PUBLIC_APP_ENV=local
NEXT_PUBLIC_ENABLE_DEMO_MODE=true
ADMIN_EMAILS=
NEXT_PUBLIC_FEEDBACK_URL=
```

`SUPABASE_SERVICE_ROLE_KEY` はクライアントで使用しないでください。
Preview/Productionでは `NEXT_PUBLIC_ENABLE_DEMO_MODE=false` とし、Supabase環境変数が未設定の場合はデモ保存へフォールバックしません。

## ルート

- `/` ランディングページ
- `/signup` 登録
- `/login` ログイン
- `/forgot-password` パスワード再設定
- `/dashboard` マイライブラリ
- `/books/new` 新規作品
- `/dashboard/books/[id]` 作品管理
- `/dashboard/books/[id]/edit` 編集
- `/books/[slug]` 公開読書ページ
- `/authors/[handle]` 作者ページ
- `/reader` ローカルプレビュー
- `/sample` サンプル作品
- `/terms` `/privacy` `/contact`

## 本番化前の注意

Supabase migrationは `supabase/migrations/001_initial_beta_schema.sql` にあります。Vercel Preview公開前に専用Supabaseプロジェクトへ適用してください。
