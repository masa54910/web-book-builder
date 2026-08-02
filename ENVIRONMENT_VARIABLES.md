# Environment Variables

更新日: 2026-08-02

## 必須

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_SITE_URL=
NEXT_PUBLIC_APP_ENV=preview
NEXT_PUBLIC_ENABLE_DEMO_MODE=false
```

Preview / Production では Supabase 接続を必須とします。未設定の場合、ユーザー画面には内部エラーや環境変数名を直接表示せず、ログイン機能が利用できない旨の一般的な案内を表示します。

- `SUPABASE_SERVICE_ROLE_KEY` は `/api/account/delete`（退会処理）に必須です。
- `NEXT_PUBLIC_SITE_URL` はAuthメール導線と運用ドキュメントで使用します。

## ローカル開発

Supabaseを使わずにUI確認する場合のみ、以下を利用できます。

```env
NEXT_PUBLIC_APP_ENV=local
NEXT_PUBLIC_ENABLE_DEMO_MODE=true
```

ローカルデモでは、ユーザー・作品データはブラウザ内に保存されます。

## 任意

```env
NEXT_PUBLIC_FEEDBACK_URL=
```

フィードバック導線を外部フォームへ接続する場合に設定します。URLは `https://` のみ許可してください。

## 公開禁止

Supabase service role key、Vercel token、GitHub tokenなどの秘密鍵を `NEXT_PUBLIC_` 付きで公開しないでください。

## 認証運用で確認する値

- Supabase Auth Site URL
- Supabase Auth Redirect URLs（localhost / Preview / Production）
- パスワード再設定 redirect URL
- メール確認必須の有無
- Auth Rate Limit設定
