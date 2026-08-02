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
