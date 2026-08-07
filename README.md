# WebBookMaker beta

WebBookMakerは、ユーザーが自分の原稿からページめくり付きWeb作品を作成・保存・公開できるNext.jsベータ版です。

コンセプトは「電子書籍を作るサービス」ではなく、「書いた文章を、読者へ届くWeb作品へ変えるサービス」です。

このプロジェクトは `trade-for-life-digital-novel` から分離された独立プロジェクトです。元作品の本文、画像、GitHub履歴、Vercel本番環境には依存しません。

## 主な機能

- 登録 / ログイン（ローカル開発のみデモ認証可。Preview/ProductionはSupabase必須）
- 新規登録のパスワード再確認（クライアント検証）
- マイライブラリ
- 作品の作成、編集、保存、複製、ソフト削除
- 公開 / 限定公開 / 非公開
- `/books/[slug]` 形式の公開読書ページ
- `/authors/[handle]` 形式の作者ページ
- LPからの直接入力、ファイル添付、20ページ確認、登録前入力の引き継ぎ
- TXT / Markdown / Word `.docx` / PDF / ZIP原稿入力
- 表紙画像、本文画像、`[[image:画像ID]]` 挿入記法
- 右綴じ / 左綴じ、PC見開き、スマホ単ページ
- 目次ジャンプ、ページジャンプ、付箋、続きから読む
- 自動ページめくり（速度変更、ループ、表紙/現在ページ開始）
- 参考URLの選択・コピー
- SNS共有、URLコピー、X投稿テンプレート
- Promotion Center（動画作成、X投稿、note記事テンプレート、URLコピー）
- Canvas/MediaRecorderベースの動画レンダリング（画面録画なし、MP4優先・WebMフォールバック）
- UI多言語の型・辞書構造（日本語 / English / 한국어 / 简体中文 / 繁體中文 / Français / Bahasa Indonesia / Tiếng Việt）
- WebBookMaker編集部キャラクターイベント（ミオ / ブッキー）
- 作品ごとのテーマ設定（背景、フォント、文字サイズ、余白、ページ幅）
- 外部販売/関連リンク表示
- ローカル閲覧解析と、公開作品向けSupabaseイベント集約
- `/analytics` + `/analytics/[bookId]` の実データ分析（期間別、流入元、デバイス、日別推移）
- `/settings` で登録情報管理（表示名、プロフィール、SNS、通知、パスワード変更、ログアウト、退会）
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
- `/analytics` 作品分析案内
- `/analytics/[bookId]` 作品分析詳細
- `/settings` 登録情報管理
- `/author` 作者ページ案内
- `/terms` `/privacy` `/commercial-transactions`（旧 `/commerce` 互換）`/guidelines` `/refund` `/contact`
- `/help` ヘルプ
- `/blog` 編集部ノート

## 正式版に向けたモジュール

- `src/lib/themeSystem.ts` テーマプリセットと作品別表示設定
- `src/lib/localization.ts` UI多言語辞書
- `src/lib/characterEvents.ts` ミオ/ブッキーのイベントメッセージ
- `src/lib/promotion.ts` X/note/共有URLのプロモーション素材生成
- `src/lib/videoRenderer.ts` Canvasベースの動画レンダリング
- `src/components/PromotionCenter.tsx` 公開後のプロモーション導線
- `src/components/CharacterAssistant.tsx` 編集部キャラクター表示

## 本番化前の注意

Supabase migrationは `supabase/migrations/001_initial_beta_schema.sql` にあります。Vercel Preview公開前に専用Supabaseプロジェクトへ適用してください。
追加のGate5向け変更として `supabase/migrations/002_profile_preferences_and_analytics_dimensions.sql` を適用してください。

## 認証運用メモ（Gate5）

- Supabase側でメール確認が必須の場合、`signup` 直後に `session` が返らないため、確認メール完了前のログインは失敗します。
- 連続登録や短時間の再試行はAuthレート制限 (`429`) を誘発します。E2E検証では同一IP/同一ドメインでの連打を避けてください。
- 本リポジトリは `emailRedirectTo: ${location.origin}/auth/callback` を使用します。Supabase AuthのSite URLとRedirect URLに `http://localhost:3001` およびVercel URLを登録してください。
- 退会API（`/api/account/delete`）は `SUPABASE_SERVICE_ROLE_KEY` が未設定だと `503` を返します。

## ベータ運用ドキュメント

- `BETA_RELEASE_CHECKLIST.md`
- `BETA_UI_OPERATION_AUDIT.md`
- `DEPLOYMENT.md`
- `SUPABASE_SETUP.md`
- `ENVIRONMENT_VARIABLES.md`
- `KNOWN_ISSUES.md`
- `DATA_DELETION_PROCEDURE.md`
