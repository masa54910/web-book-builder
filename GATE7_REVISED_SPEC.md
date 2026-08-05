# WebBookMaker Gate 7 修正版仕様

更新日：2026年8月5日  
対象：`web-book-builder`  
状態：Gate 7 の実装正本

この文書は、Phase 1 の本番監査結果を反映した Gate 7 の最新版仕様です。既存の Reader、編集画面、認証、下書き、Vercel 構成を維持し、保存・公開を最優先で完成させます。

## 1. 優先順位

実装順は次のとおりです。

1. Supabase の保存基盤（`books`、`book_images`、`book_external_links`、RLS、Storage）
2. 本番保存 → 作品一覧 → 再編集
3. 本番公開 → 公開URL → ログアウト閲覧
4. X / Facebook / note / LINE / URLコピー共有

SNS共有は、保存・再編集・公開が本番で成立した後に実装・検証します。

## 2. 現在確認されているブロッカー

本番Supabaseでは次の状態です。

- `public.books`：存在
- `public.book_external_links`：存在
- `public.book_images`：`PGRST205`（スキーマキャッシュ上で未検出）
- `book-assets`：Bucket存在を確認

`saveBook()` が `books` 保存後に `book_images` を同期するため、`book_images` 未反映の状態では保存を成功扱いにしません。ProductionでlocalStorageへフォールバックして、保存成功に見せる動作も禁止します。

## 3. Supabase保存基盤

### 必須テーブル

`public.books`

- `id uuid primary key`
- `owner_id uuid not null`
- 作品メタデータ（タイトル、作者、説明、slug）
- `status`（`draft` / `published` / `archived`）
- `visibility`（`private` / `unlisted` / `public`）
- `raw_text`、`book_project_json`
- `created_at`、`updated_at`、公開日時
- `slug` は公開作品間で重複不可

`public.book_images`

- `id uuid primary key`
- `book_id uuid references public.books(id) on delete cascade`
- `owner_id uuid not null`
- `image_key`、`storage_path`、`caption`
- `chapter_id`、`sort_order`
- 保存・再編集時に作品の画像一覧と同期する

`public.book_external_links`

- `id uuid primary key`
- `book_id uuid references public.books(id) on delete cascade`
- `owner_id uuid not null`
- `label`、`url`、`link_type`、`sort_order`、`is_enabled`

### RLS

- authenticated：自分の作品・画像・外部リンクのみ insert / select / update / delete
- anon：`status = published` かつ `visibility in ('public', 'unlisted')` の作品と関連画像・有効な外部リンクをselect
- 他ユーザーの下書き・非公開作品は取得不可
- 本番でテーブル不足・RLS拒否が発生した場合は、localStorageへフォールバックせず明確なエラーを表示する

### Storage

- Bucket名：`book-assets`
- 表紙・本文画像を保存する
- 推奨パス：`books/{ownerId}/{bookKey}/{cover|images}/...`
- owner本人に upload / update / delete を許可
- 公開作品のReaderには必要な画像のreadを許可
- 10MB制限、JPEG / PNG / WebPを維持
- Bucket、policy、公開Readerからの画像取得を本番で実操作確認する

Migration適用後は、テーブル存在、列、外部キー、unique制約、RLS、Storage policy、PostgRESTスキーマ反映を確認します。

## 4. 本番保存フロー

```text
必須項目検証
↓
画像アップロード完了
↓
books upsert
↓
book_images 同期
↓
book_external_links 同期
↓
Supabaseの実UUIDを返す
↓
実UUIDの編集URLへ遷移
↓
マイライブラリへ表示
```

保存成功条件：

- 「保存しました。」が表示される
- マイライブラリに作品が表示される
- 一覧から開くと本文・画像・画像位置・設定が復元される
- 再編集して再保存できる
- Productionではブラウザ下書きだけを保存成功と扱わない

「新しい作品を作る」は原則空の編集画面で開始します。LPから持ち込んだ本文、明示的な下書き復元URL、プレビューから戻る場合だけ復元します。

## 5. 本番公開フロー

```text
必須項目検証
↓
最新内容を保存
↓
画像アップロード完了確認
↓
books.status = published
↓
visibility = public または unlisted
↓
公開日時を保存
↓
公開URLを表示
```

公開URLは次の形式です。

```text
https://webbookmaker.vercel.app/books/{slug}
```

ユーザー画面には「公開URL」と表示し、`slug`という用語は表示しません。slug重複時は公開を中止して、利用可能な値を入力できるようにします。

公開成功条件：

- 保存済み作品を公開できる
- 公開URLを別タブで開ける
- ログアウト状態でも読める
- マイライブラリで公開状態が分かる
- 作者ページに公開作品が反映される
- 同じslugで別作品を公開できない
- 再編集・再保存・再公開ができる

## 6. SNS共有仕様

共有は正式な公開URLが存在する作品だけで有効にします。公開前のlocalhost、内部プレビューURL、トップページURLは共有しません。

すべての外部ページは新しいタブで開きます。

```html
target="_blank" rel="noopener noreferrer"
```

### X

Xは正式テンプレートを使用します。

```text
『作品タイトル』

作品紹介

公開URL

#WebBookMaker
```

作品タイトル、説明、公開URL、`#WebBookMaker`をX intentへ渡します。OGPは次を満たします。

- タイトル：作品タイトル
- 説明：作品紹介
- サムネイル：表紙画像、取得できない場合はデフォルト画像
- 推奨サイズ：1200×630
- `shareVersion`変更時にキャッシュを更新できる

### note

独立した「note文面をコピー」ボタンは作りません。`noteで共有`の1回の操作で次を実行します。

1. note用テンプレートをClipboardへコピー
2. `https://note.com/notes/new`を新しいタブで開く
3. 「note用の文章をコピーしました。開いたnoteの記事画面に貼り付けてください。」を表示

テンプレートには作品タイトル、作品紹介、公開URL、`#WebBookMaker`を含めます。note側への自動入力は保証しません。

### Facebook

Facebook共有は削除しません。noteと同じく、ボタン1回で次を実行します。

1. Facebook投稿用テンプレートをClipboardへコピー
2. Facebook投稿画面または共有画面を新しいタブで開く
3. 「Facebook用の文章をコピーしました。」を表示

Facebook側が外部から本文を自動入力できない場合でも、Clipboardコピーを成功条件とします。

### LINE

LINE ShareのURLへ、作品タイトル・作品紹介・正式公開URLをURLエンコードして渡します。

```text
https://social-plugins.line.me/lineit/share?url={encodedPublicUrl}&text={encodedShareText}
```

`shareText`には作品タイトル、作品紹介、公開URLを含めます。スマートフォンではLINEアプリまたは共有先選択、PCではLINE Share画面が開くことを確認します。LINE側が`text`を無視する環境では、少なくとも公開URLが正しく渡り、Clipboardフォールバックを表示します。

### URLコピー

- 正式公開URLをClipboardへコピー
- 成功時：「コピーしました。」
- 失敗時：「URLをコピーできませんでした。」
- 未公開時は無効化し、「作品を公開すると共有できます。」と表示

## 7. 本番E2E完了条件

Vercel Productionで、実際に次を確認した場合のみGate 7完了とします。

```text
新規登録
↓
作品作成
↓
本文・画像入力
↓
保存
↓
マイライブラリ表示
↓
再編集
↓
公開
↓
公開URL閲覧
↓
X共有
↓
Facebook共有
↓
note共有
↓
LINE共有
↓
URLコピー
```

確認環境：PC・スマートフォン各1回以上。操作、表示、Clipboard、外部タブ遷移、公開後のログアウト閲覧を確認します。

## 8. 実装単位と検証

### Commit 1

`Fix production book persistence and library listing`

保存基盤、migration、RLS、Storage、一覧、再編集を対象にします。

### Commit 2

`Complete production publishing workflow`

公開状態、slug、公開URL、公開Reader、ログアウト閲覧を対象にします。

### Commit 3

`Finalize X Facebook note and LINE sharing flows`

X正式テンプレート、OGP、Facebook維持、note Clipboard、LINE共有を対象にします。

各単位で次を実行します。

```text
git diff --check
npm run lint
npm test
npm run build
```

検証後にcommit、push、Vercel Production反映確認を行います。未検証の状態でGate 7完了とは報告しません。

