# Known issues

- Supabase未設定時のローカルデモ認証・localStorage保存は、development/local環境で明示的に有効化した場合だけ動作します。
- 本文画像はローカルデモではdata URLとしてBookProjectへ保持します。PreviewではSupabase Storageへのアップロードが必要です。
- 有料販売、会員限定、パスワード閲覧は型だけ用意し、実処理は未実装です。
- フォロー、コメント、ランキング、決済、投げ銭は仕様上まだ実装していません。
- 閲覧解析はSupabaseイベント集約を実装済みですが、本格的なBot対策・流入元解析は未実装です。
- Supabase Authで短時間にsignup/loginを繰り返すと `429` が発生し、E2Eが中断される場合があります。
- メール確認必須設定の環境では、signup直後にセッションが発行されず `Invalid login credentials` になる場合があります（確認メール完了後にログインが必要）。
- `/api/account/delete` は `SUPABASE_SERVICE_ROLE_KEY` が未設定だと実行できません。
- OGP画像の自動生成は未実装です。metadataの土台のみ用意しています。
- ZIP内画像の自動紐付けは今後の拡張候補です。現状はZIP内の本文ファイル読み込みを優先します。
- Word `.docx` はプレーンテキスト抽出です。複雑なレイアウト、脚注、表、画像は完全再現しません。
- `npm audit` にhigh advisoryが残っています。破壊的な `npm audit fix --force` は未実行です。
