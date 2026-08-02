# WebBookMaker Beta UI Operation Audit

更新日: 2026-08-02

## 方針

Ver.2 LP のデザインを維持したまま、画面上に存在する主要ボタン・リンクが無反応にならないことを確認するための棚卸しです。

## LP

| 表示 | 配置 | 現在の動作 | 状態 |
| --- | --- | --- | --- |
| Webブックを作る | Header | LP入力欄 `#create` へ移動 | 動作済み |
| ログイン | Header | `/login` へ遷移 | 動作済み |
| 作り方 | Header/Footer | `#howto` へスクロール | 動作済み |
| サンプル | Header/Footer | `#samples` へスクロール | 動作済み |
| 料金プラン | Header/Footer | `#pricing` へスクロール | 動作済み |
| 作品を広める | Header/Footer | `#promotion` へスクロール | 動作済み |
| よくある質問 | Header/Footer | FAQへスクロール | 動作済み |
| サンプルのWebブックを見る | Hero/下部CTA | `/sample` へ遷移 | 動作済み |
| ファイルを添付 | Hero/下部CTA | ファイル選択、drag & drop、抽出、本文追記 | 動作済み |
| Webブックを作る | Hero/下部CTA | 推定ページ数確認ダイアログを表示 | 動作済み |
| 分析レポート | かんたん3ステップ | `/dashboard` へ遷移 | 動作済み |
| 動画を作る | Promotion | `/signup?next=%2Fdashboard` へ遷移 | 動作済み |
| Xで共有する | Promotion | `/signup?next=%2Fdashboard` へ遷移 | 動作済み |
| note記事を作る | Promotion | `/signup?next=%2Fdashboard` へ遷移 | 動作済み |
| 作者ページを見る | Promotion | `/signup?next=%2Fdashboard` へ遷移 | 動作済み |
| FAQ開閉 | FAQ | details/summaryで展開 | 動作済み |
| 利用規約 | Footer | `/terms` | 動作済み |
| プライバシー | Footer | `/privacy` | 動作済み |
| 特商法表記 | Footer | `/commerce` | 動作済み |
| 投稿ガイドライン | Footer | `/guidelines` | 動作済み |
| 返金方針 | Footer | `/refund` | 動作済み |
| お問い合わせ | Footer | `/contact` | 動作済み |

## 認証

| 表示 | 配置 | 現在の動作 | 状態 |
| --- | --- | --- | --- |
| ホームへ戻る | login/signup/forgot/callback | `/` へ遷移 | 動作済み |
| ログイン | `/login` | Supabaseまたはローカルデモ認証 | 動作済み |
| 新規登録 | `/signup` | Supabaseまたはローカルデモ登録 | 動作済み |
| パスワードを忘れた方 | `/forgot-password` | Supabase resetPassword、デモ時は案内表示 | 動作済み |
| ログアウト | AppHeader | signOut後、セッション解除 | 動作済み |

## ログイン後

| 表示 | 配置 | 現在の動作 | 状態 |
| --- | --- | --- | --- |
| 新しい作品を作る | Dashboard | `/books/new` | 動作済み |
| 保存 | Editor | BookProject保存 | 動作済み |
| プレビュー | Editor | `/reader` でBookReader表示 | 動作済み |
| 公開 | Editor/管理 | publishedへ更新 | 動作済み |
| 非公開/公開停止 | Editor/管理/Dashboard | draft/privateへ更新 | 動作済み |
| 削除 | Dashboard | 確認後soft delete | 動作済み |
| 複製 | Dashboard | BookProject複製 | 動作済み |
| 作者ページ | Dashboard/Reader | `/authors/[handle]` | 動作済み |
| 分析 | 管理画面 | 閲覧・読了・共有・外部リンク集計 | 動作済み |
| X共有 | Promotion Center | 投稿文コピー + X intent | 動作済み |
| note記事作成 | Promotion Center | note本文コピー + note新規作成画面 | 動作済み |
| URLコピー | Promotion Center/Reader | Clipboard API | 動作済み |

## Reader

| 表示 | 配置 | 現在の動作 | 状態 |
| --- | --- | --- | --- |
| 前のページ/次のページ | ReaderControls | BookReaderのページ移動 | 動作済み |
| 目次 | ReaderControls | 目次ページへ移動 | 動作済み |
| 続きから読む | ReadingTools | localStorageの読書位置へ復帰 | 動作済み |
| 付箋 | ReadingTools | localStorage保存・一覧ジャンプ | 動作済み |
| 全画面/共有 | Reader系 | 既存Reader/ShareToolsで提供 | 動作済み |

## 既知の制限

- PDFはベータ版の簡易テキスト抽出です。画像だけのPDFはOCR対象外です。
- Promotion CenterのInstagram等のチャンネルは、将来追加予定として状態表示のみです。
- 決済は未導入です。料金カードは案内であり、課金処理は行いません。
