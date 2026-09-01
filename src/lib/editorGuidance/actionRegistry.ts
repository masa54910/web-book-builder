import {
  EDITOR_GUIDANCE_ACTION_IDS,
  EDITOR_HELP_ACTION_IDS,
  type EditorActionId,
  type EditorGuidanceActionId,
  type EditorHelpActionId,
} from "@/lib/editorGuidance/actionIds";

export type EditorActionDefinition = {
  id: EditorActionId;
  owner: "guidance" | "help";
  target:
    | "block"
    | "page"
    | "paywall"
    | "manuscript"
    | "manuscript-import"
    | "smart-format"
    | "smart-undo"
    | "insert-image"
    | "pending-image"
    | "insert-youtube"
    | "insert-page-break"
    | "insert-columns"
    | "insert-paywall"
    | "existing-paywall"
    | "cover"
    | "save"
    | "preview"
    | "publish"
    | "slug"
    | "external-sales";
  buttonLabel: string;
  ariaLabel: string;
};

export type EditorGuidanceActionDefinition = EditorActionDefinition & {
  id: EditorGuidanceActionId;
  owner: "guidance";
};

export type EditorHelpActionDefinition = EditorActionDefinition & {
  id: EditorHelpActionId;
  owner: "help";
};

const EDITOR_ACTION_REGISTRY: Record<
  EditorActionId,
  EditorActionDefinition
> = {
  [EDITOR_GUIDANCE_ACTION_IDS.blockFocus]: {
    id: EDITOR_GUIDANCE_ACTION_IDS.blockFocus,
    owner: "guidance",
    target: "block",
    buttonLabel: "見出しを見る",
    ariaLabel: "内容が空の見出しを編集画面で表示",
  },
  [EDITOR_GUIDANCE_ACTION_IDS.pageFocus]: {
    id: EDITOR_GUIDANCE_ACTION_IDS.pageFocus,
    owner: "guidance",
    target: "page",
    buttonLabel: "このページを見る",
    ariaLabel: "文章量が多いページを編集画面で表示",
  },
  [EDITOR_GUIDANCE_ACTION_IDS.paywallFocus]: {
    id: EDITOR_GUIDANCE_ACTION_IDS.paywallFocus,
    owner: "guidance",
    target: "paywall",
    buttonLabel: "Paywallを見る",
    ariaLabel: "有料境界を編集画面で表示",
  },
  [EDITOR_HELP_ACTION_IDS.manuscriptFocus]: { id: EDITOR_HELP_ACTION_IDS.manuscriptFocus, owner: "help", target: "manuscript", buttonLabel: "本文Editorへ", ariaLabel: "本文編集エリアへ移動" },
  [EDITOR_HELP_ACTION_IDS.manuscriptImportFocus]: { id: EDITOR_HELP_ACTION_IDS.manuscriptImportFocus, owner: "help", target: "manuscript-import", buttonLabel: "原稿読み込みへ", ariaLabel: "原稿ファイル読み込み欄へ移動" },
  [EDITOR_HELP_ACTION_IDS.smartFormatFocus]: { id: EDITOR_HELP_ACTION_IDS.smartFormatFocus, owner: "help", target: "smart-format", buttonLabel: "自動で整えるへ", ariaLabel: "自動で整えるボタンへ移動" },
  [EDITOR_HELP_ACTION_IDS.smartUndoFocus]: { id: EDITOR_HELP_ACTION_IDS.smartUndoFocus, owner: "help", target: "smart-undo", buttonLabel: "整形前に戻すへ", ariaLabel: "整形前に戻すボタンへ移動" },
  [EDITOR_HELP_ACTION_IDS.imageInsertOpen]: { id: EDITOR_HELP_ACTION_IDS.imageInsertOpen, owner: "help", target: "insert-image", buttonLabel: "画像追加へ", ariaLabel: "本文の画像追加メニューを開く" },
  [EDITOR_HELP_ACTION_IDS.pendingImageFocus]: { id: EDITOR_HELP_ACTION_IDS.pendingImageFocus, owner: "help", target: "pending-image", buttonLabel: "未完了画像へ", ariaLabel: "再アップロードが必要な画像へ移動" },
  [EDITOR_HELP_ACTION_IDS.youtubeInsertOpen]: { id: EDITOR_HELP_ACTION_IDS.youtubeInsertOpen, owner: "help", target: "insert-youtube", buttonLabel: "YouTube追加へ", ariaLabel: "YouTube動画追加画面を開く" },
  [EDITOR_HELP_ACTION_IDS.pageBreakOpen]: { id: EDITOR_HELP_ACTION_IDS.pageBreakOpen, owner: "help", target: "insert-page-break", buttonLabel: "改ページ追加へ", ariaLabel: "改ページの挿入メニューを開く" },
  [EDITOR_HELP_ACTION_IDS.columnsInsertOpen]: { id: EDITOR_HELP_ACTION_IDS.columnsInsertOpen, owner: "help", target: "insert-columns", buttonLabel: "2カラム追加へ", ariaLabel: "2カラムの挿入メニューを開く" },
  [EDITOR_HELP_ACTION_IDS.paywallInsertOpen]: { id: EDITOR_HELP_ACTION_IDS.paywallInsertOpen, owner: "help", target: "insert-paywall", buttonLabel: "有料部分設定へ", ariaLabel: "ここから有料の挿入メニューを開く" },
  [EDITOR_HELP_ACTION_IDS.paywallExistingFocus]: { id: EDITOR_HELP_ACTION_IDS.paywallExistingFocus, owner: "help", target: "existing-paywall", buttonLabel: "Paywallへ", ariaLabel: "既存の有料境界へ移動" },
  [EDITOR_HELP_ACTION_IDS.coverFocus]: { id: EDITOR_HELP_ACTION_IDS.coverFocus, owner: "help", target: "cover", buttonLabel: "表紙設定へ", ariaLabel: "表紙画像設定へ移動" },
  [EDITOR_HELP_ACTION_IDS.saveFocus]: { id: EDITOR_HELP_ACTION_IDS.saveFocus, owner: "help", target: "save", buttonLabel: "保存へ", ariaLabel: "保存ボタンへ移動" },
  [EDITOR_HELP_ACTION_IDS.previewFocus]: { id: EDITOR_HELP_ACTION_IDS.previewFocus, owner: "help", target: "preview", buttonLabel: "プレビューへ", ariaLabel: "プレビューボタンへ移動" },
  [EDITOR_HELP_ACTION_IDS.publishFocus]: { id: EDITOR_HELP_ACTION_IDS.publishFocus, owner: "help", target: "publish", buttonLabel: "公開設定へ", ariaLabel: "公開ボタンへ移動" },
  [EDITOR_HELP_ACTION_IDS.slugFocus]: { id: EDITOR_HELP_ACTION_IDS.slugFocus, owner: "help", target: "slug", buttonLabel: "公開URL設定へ", ariaLabel: "公開URL入力欄へ移動" },
  [EDITOR_HELP_ACTION_IDS.externalSalesFocus]: { id: EDITOR_HELP_ACTION_IDS.externalSalesFocus, owner: "help", target: "external-sales", buttonLabel: "外部販売URL設定へ", ariaLabel: "外部販売ページURL設定へ移動" },
};

export function getEditorActionDefinition(actionId: EditorActionId | undefined) {
  return actionId ? EDITOR_ACTION_REGISTRY[actionId] : undefined;
}

export function getEditorGuidanceActionDefinition(
  actionId: EditorGuidanceActionId | undefined,
) {
  const definition = getEditorActionDefinition(actionId);
  return definition?.owner === "guidance" ? definition as EditorGuidanceActionDefinition : undefined;
}

export function getEditorHelpActionDefinition(
  actionId: EditorHelpActionId | undefined,
) {
  const definition = getEditorActionDefinition(actionId);
  return definition?.owner === "help" ? definition as EditorHelpActionDefinition : undefined;
}

export function actionDefinitionForIssueId(
  actionId: EditorGuidanceActionId | undefined,
  issueId: string,
) {
  const definition = getEditorGuidanceActionDefinition(actionId);
  if (!definition || issueId !== "page.text-heavy-sequence") return definition;
  return {
    ...definition,
    buttonLabel: "最初のページを見る",
    ariaLabel: "文章量が多い連続ページの最初を編集画面で表示",
  };
}
