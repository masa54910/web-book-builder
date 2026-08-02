# Beta release checklist

## 実装確認

- [x] 登録 / ログイン
- [x] マイライブラリ
- [x] 新規作成
- [x] 編集
- [x] 保存
- [x] 公開 / 限定公開 / 公開停止
- [x] 公開URL `/books/[slug]`
- [x] 作者ページ `/authors/[handle]`
- [x] LP直接入力
- [x] LPファイル添付
- [x] 20ページ確認ダイアログ
- [x] 登録前入力の保持
- [x] TXT / Markdown / Word / PDF / ZIP入力
- [x] 表紙画像
- [x] 本文画像
- [x] 付箋
- [x] 続きから読む
- [x] ページジャンプ
- [x] 右綴じ / 左綴じ
- [x] サンプル作品
- [x] SNS共有 / URLコピー
- [x] 外部リンク表示
- [x] 無料プランブランド表示
- [x] 閲覧解析のローカル土台
- [x] 公開作品向けSupabase解析イベント送信
- [x] Preview noindex
- [x] Previewでデモモード禁止

## 本番公開前に必要

- [ ] Supabaseプロジェクト作成
- [ ] migration適用
- [ ] RLSの手動確認
- [ ] Storage bucket / policy実機確認
- [ ] Vercel新規Project作成
- [ ] 本番環境変数設定
- [ ] Terms / Privacy正式版
- [ ] 問い合わせ先
- [ ] abuse report / takedown flow
- [ ] OGP画像生成
- [x] 解析のサーバー保存実装
- [ ] Preview Deployment実機確認
- [ ] Production Deployment

## 外部変更未実行

- GitHub push: 作業単位ごとに実行
- Vercel link/deploy: 未実行
- Supabase本番migration: 未実行

## Gate 5: サービス開始可能チェックリスト

### E2E（必須）

- [ ] 登録 -> `/books/new` 遷移（`next`付き）
- [ ] ログイン -> `/books/new` 遷移（`next`付き）
- [ ] 新規作成 -> 保存 -> 公開 -> `/books/[slug]` 表示
- [ ] 公開済み作品の再編集と公開停止
- [ ] 共有導線（X / note / LINE / URLコピー）の実動作

### UI/導線（必須）

- [x] Header「作り方/作品を広める/よくある質問」をホーム内アンカーに統合
- [x] `/pricing` をLP統一デザインで再構築
- [x] サンプルReaderに `←ホームへ戻る` / `無料ではじめる` を設置
- [x] LPプロモーションCTAを `/demo/*` 見本画面へ接続
- [x] LP入力文言を「コピペしてください」に統一
- [x] signupにパスワード確認欄を追加（空欄/不一致バリデーション）
- [x] STEP1「Webブックを作る」を見本UIへ変更（非リンク）
- [x] `/settings` を登録情報管理画面として拡張
- [x] `/analytics` `/analytics/[bookId]` の実データ分析画面を実装

### 運用（必須）

- [ ] Vercel Previewで主要ルートの最終確認
- [ ] Vercel Productionデプロイ
- [ ] Supabase Rate Limit / メール確認ポリシー確認
- [ ] 監視・障害導線（問い合わせ、削除依頼、利用規約リンク）最終確認

### 現在のブロッカー（2026-08-02）

- Supabase認証で `429` が発生し、検証アカウントでのログインE2Eが完了していない
- `/books/new` 以降の実認証フローは、レート制限解除または既存検証アカウントの提供後に再開
- `SUPABASE_SERVICE_ROLE_KEY` 未設定のため、退会APIの本番同等検証が未完了
