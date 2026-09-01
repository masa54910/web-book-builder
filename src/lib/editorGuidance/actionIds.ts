export const EDITOR_GUIDANCE_ACTION_IDS = {
  blockFocus: "editor.block.focus",
  pageFocus: "editor.page.focus",
  paywallFocus: "editor.paywall.focus",
} as const;

export const EDITOR_HELP_ACTION_IDS = {
  manuscriptFocus: "editor.manuscript.focus",
  manuscriptImportFocus: "editor.manuscript.import.focus",
  smartFormatFocus: "editor.smart-format.focus",
  smartUndoFocus: "editor.smart-undo.focus",
  imageInsertOpen: "editor.image.insert.open",
  pendingImageFocus: "editor.image.pending.focus",
  youtubeInsertOpen: "editor.youtube.insert.open",
  pageBreakOpen: "editor.page-break.open",
  columnsInsertOpen: "editor.columns.insert.open",
  paywallInsertOpen: "editor.paywall.insert.open",
  paywallExistingFocus: "editor.paywall.existing.focus",
  coverFocus: "editor.cover.focus",
  saveFocus: "editor.save.focus",
  previewFocus: "editor.preview.focus",
  publishFocus: "editor.publish.focus",
  slugFocus: "editor.slug.focus",
  externalSalesFocus: "editor.external-sales.focus",
} as const;

export type EditorGuidanceActionId =
  typeof EDITOR_GUIDANCE_ACTION_IDS[keyof typeof EDITOR_GUIDANCE_ACTION_IDS];

export type EditorHelpActionId =
  typeof EDITOR_HELP_ACTION_IDS[keyof typeof EDITOR_HELP_ACTION_IDS];

export type EditorActionId = EditorGuidanceActionId | EditorHelpActionId;
