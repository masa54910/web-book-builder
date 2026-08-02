# Data deletion procedure

限定ベータ参加者から削除依頼が来た場合の手順です。

1. 依頼者本人確認を行う（登録メールアドレス、対象URL、依頼日時）。
2. 対象アカウント、作品、公開URLを特定する。
3. まず作品を `draft/private` に変更し、公開URLから閲覧できないことを確認する。
4. 必要に応じて `books.deleted_at` を設定し、一覧から除外する。
5. Storageの `books/{ownerId}/{bookId}/...` 配下の画像を削除する。
6. 完全削除が必要な場合は、profiles / books / book_images / links / analytics の扱いを事前に合意する。
7. 対応日時、対象、実施者を記録する。

## アプリ内退会（Gate5）

- `/settings` の「アカウント削除」から2段階確認で実行
- バックエンドは `/api/account/delete` を利用
- `SUPABASE_SERVICE_ROLE_KEY` 未設定時は `503` で停止
- Authユーザー削除時、DBは `on delete cascade` で関連データが削除される

## 注意

- パスワードや秘密情報をログへ出力しない
- 削除依頼の証跡（依頼本文・対応者・実施時刻）を運用台帳に残す

問い合わせ先・削除依頼先メールアドレスは限定ベータ開始前に確定してください。
