# Supabase setup

このファイルは本番Supabaseへ移行するための手順メモです。今回の実装では外部Supabaseへの変更は行っていません。

## 1. 新規Supabaseプロジェクト

既存作品や別サービスと混在させず、WebBookMaker専用プロジェクトを作成します。

## 2. Migration適用

`supabase/migrations/001_initial_beta_schema.sql` をレビューしたうえで、Supabase SQL EditorまたはSupabase CLIで適用します。
続けて `supabase/migrations/002_profile_preferences_and_analytics_dimensions.sql` も適用します。

含まれるもの:

- `profiles`
- `books`
- `book_images`
- `author_links`
- `book_external_links`
- `book_analytics_events`
- `book_analytics_daily`
- 作者ページ用 `handle` / `author_handle`
- RLS policies
- Storage buckets / policies
- 新規ユーザー作成時のprofile生成trigger
- `profile_preferences`（通知設定）
- `book_analytics_events` の `referrer_source` / `device_type`

## 3. Storage bucket

将来のクラウド画像保存用に、以下のbucketを作成します。

- `book-assets`
- `profile-assets`

ローカルデモ時はdata URLをBookProject内に保持します。Supabase接続時は表紙・本文画像をStorageへアップロードし、BookProjectには `storage:bucket/path` 参照を保存します。

## 4. 環境変数

Vercelまたは `.env.local` に設定します。

```env
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
NEXT_PUBLIC_SITE_URL=https://your-project.vercel.app
NEXT_PUBLIC_APP_ENV=preview
NEXT_PUBLIC_ENABLE_DEMO_MODE=false
```

`SUPABASE_SERVICE_ROLE_KEY` はサーバー専用です。ブラウザへ露出させないでください。

## 5. Auth設定（Gate5）

- Site URL: `http://localhost:3001`（ローカル検証時）と本番URL
- Redirect URLs:
	- `http://localhost:3001/auth/callback`
	- `https://<preview-domain>/auth/callback`
	- `https://<production-domain>/auth/callback`
- Password reset redirect URL: 同上
- メール確認必須を有効にする場合:
	- signup直後ログインE2Eは失敗するため、確認メール完了後にログインする

## 6. 429対策とテストアカウント運用

- 同一IPで連続signupを実行しない
- ランダムメール大量発行での再試行をしない
- 既存の検証アカウントを再利用する
- 429発生時は時間を空け、まずSupabase Authログで原因を確認する

## 7. RLS確認

- ownerは自分の作品をCRUDできる
- visitorは `published` かつ `public/unlisted` の作品だけ読める
- `private` / `draft` / `archived` はowner以外読めない
- soft deleteは `deleted_at` を設定し、通常一覧から除外する
- anonymous readerは公開/限定公開作品へのanalytics event insertだけ可能
- owner以外は他人の解析をselectできない
- `profile_preferences` は owner本人のみselect/updateできる
