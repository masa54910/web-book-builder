<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# WebBookMaker UI実装ルール

1. 新しいUIを作る前に、既存の共通コンポーネントを検索する。
2. 同一用途のコンポーネントが存在する場合、必ず流用する。
3. ページ内で共通ボタン・カード・戻るリンクを直接実装しない。
4. 色、角丸、影、余白はデザイントークンを使用する。
5. 新しい共通コンポーネントを作る場合、既存実装で代替できない理由を確認する。
6. 共通コンポーネントの変更は、利用全ページへの影響を確認する。
7. ページ固有CSSは、そのページ固有のレイアウトと演出に限定する。
8. 認証、Reader、保存、公開ロジックはUI整理を理由に作り直さない。
9. 新規ページには、公開ページか管理ページかに応じた共通ヘッダーと戻る導線を必ず配置する。
10. lint、test、build、PC・スマホ確認を行ってからコミットする。
