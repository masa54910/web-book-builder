import assert from "node:assert/strict";

import type { BookContentBlock } from "../src/lib/bookProject";
import {
  EDITOR_HELP_ACTION_IDS,
  type EditorActionId,
} from "../src/lib/editorGuidance/actionIds";
import {
  getEditorActionDefinition,
  getEditorHelpActionDefinition,
} from "../src/lib/editorGuidance/actionRegistry";
import {
  classifyEditorHelpEntry,
  resolveEditorHelpRoute,
} from "../src/lib/editorGuidance/helpActions";
import { EDITOR_HELP_CATALOG } from "../src/lib/editorGuidance/helpCatalog";
import { matchHelpIntent } from "../src/lib/editorGuidance/helpMatcher";
import { resolveHelpBlockNavigationTarget } from "../src/lib/editorGuidance/editorNavigation";

const entriesByKind = Object.groupBy(EDITOR_HELP_CATALOG, classifyEditorHelpEntry);
assert.deepEqual(
  {
    ACTION: entriesByKind.ACTION?.length || 0,
    ROUTE: entriesByKind.ROUTE?.length || 0,
    ANSWER_ONLY: entriesByKind.ANSWER_ONLY?.length || 0,
    UNSUPPORTED: entriesByKind.UNSUPPORTED?.length || 0,
  },
  { ACTION: 17, ROUTE: 4, ANSWER_ONLY: 16, UNSUPPORTED: 5 },
);

for (const entry of EDITOR_HELP_CATALOG) {
  const kind = classifyEditorHelpEntry(entry);
  if (kind === "ACTION") {
    const definition = getEditorHelpActionDefinition(entry.actionId);
    assert.ok(definition, `missing definition: ${entry.intent}`);
    assert.equal(definition.owner, "help");
    assert.ok(definition.buttonLabel.trim(), `empty action label: ${entry.intent}`);
    assert.ok(definition.ariaLabel.trim(), `empty action aria-label: ${entry.intent}`);
  }
  if (kind === "UNSUPPORTED") {
    assert.equal(entry.actionId, undefined, `unsupported intent must not have an action: ${entry.intent}`);
    assert.equal(entry.route, undefined, `unsupported intent must not have a route: ${entry.intent}`);
  }
}

assert.equal(getEditorActionDefinition("editor.unknown" as EditorActionId), undefined);

const analytics = EDITOR_HELP_CATALOG.find((entry) => entry.intent === "analytics");
const pricing = EDITOR_HELP_CATALOG.find((entry) => entry.intent === "pricing");
assert.ok(analytics && pricing);
assert.equal(resolveEditorHelpRoute(analytics), "/analytics");
assert.equal(resolveEditorHelpRoute(analytics, "book/id with spaces"), "/analytics/book%2Fid%20with%20spaces");
assert.equal(resolveEditorHelpRoute(pricing, "ignored-book-id"), "/pricing");

const frozenBlocks = Object.freeze([
  Object.freeze({ id: "text-1", type: "text", content: "無料部分" }),
  Object.freeze({
    id: "image-pending",
    type: "image",
    storagePath: "pending/local",
    fileName: "pending.png",
    mimeType: "image/png",
    width: 1200,
    height: 800,
    fitMode: "contain",
    pageMode: "inline",
    uploadState: "pending",
  }),
  Object.freeze({ id: "paywall-1", type: "paywall", previousBlockId: "text-1" }),
] satisfies readonly BookContentBlock[]);
const before = JSON.stringify(frozenBlocks);

assert.deepEqual(
  resolveHelpBlockNavigationTarget(EDITOR_HELP_ACTION_IDS.pendingImageFocus, frozenBlocks),
  { status: "handled", blockId: "image-pending" },
);
assert.deepEqual(
  resolveHelpBlockNavigationTarget(EDITOR_HELP_ACTION_IDS.paywallExistingFocus, frozenBlocks),
  { status: "handled", blockId: "paywall-1" },
);
assert.deepEqual(
  resolveHelpBlockNavigationTarget(EDITOR_HELP_ACTION_IDS.coverFocus, frozenBlocks),
  { status: "unavailable" },
);
assert.deepEqual(
  resolveHelpBlockNavigationTarget(EDITOR_HELP_ACTION_IDS.pendingImageFocus, [frozenBlocks[0]]),
  { status: "not-found" },
);
assert.equal(JSON.stringify(frozenBlocks), before, "Help navigation must not mutate Canonical blocks");

const ambiguousSales = matchHelpIntent("販売したい", EDITOR_HELP_CATALOG);
assert.equal(ambiguousSales.kind, "ambiguous");
if (ambiguousSales.kind === "ambiguous") {
  assert.deepEqual(
    new Set(ambiguousSales.entries.map((entry) => entry.actionId)),
    new Set([
      EDITOR_HELP_ACTION_IDS.paywallInsertOpen,
      EDITOR_HELP_ACTION_IDS.externalSalesFocus,
    ]),
  );
}

const unsupported = matchHelpIntent("AIで文章を書き直したい", EDITOR_HELP_CATALOG);
assert.equal(unsupported.kind, "answer");
if (unsupported.kind === "answer") {
  assert.equal(classifyEditorHelpEntry(unsupported.entry), "UNSUPPORTED");
  assert.equal(unsupported.entry.actionId, undefined);
}

console.log(
  `Editor Help actions verification passed: ${EDITOR_HELP_CATALOG.length} intents, `
  + `${Object.values(EDITOR_HELP_ACTION_IDS).length} registered low-risk actions.`,
);
