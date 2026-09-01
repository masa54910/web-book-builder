import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";

import sharp from "sharp";

import {
  BOOKY_HELP_PRESENTATIONS,
  bookyQueryState,
  resolveBookyHelpState,
} from "../src/lib/editorGuidance/bookyHelp";
import { EDITOR_HELP_CATALOG } from "../src/lib/editorGuidance/helpCatalog";

assert.equal(bookyQueryState(false, "fallback"), "idle");
assert.equal(bookyQueryState(true, "answer"), "answered");
assert.equal(bookyQueryState(true, "ambiguous"), "ambiguous");
assert.equal(bookyQueryState(true, "fallback"), "noMatch");

assert.equal(resolveBookyHelpState({ helpOpen: false, queryState: "idle", actionSuccess: false, hasGuidance: false }), "idle");
assert.equal(resolveBookyHelpState({ helpOpen: false, queryState: "idle", actionSuccess: false, hasGuidance: true }), "guidance");
assert.equal(resolveBookyHelpState({ helpOpen: false, queryState: "idle", actionSuccess: true, hasGuidance: true }), "success");
assert.equal(resolveBookyHelpState({ helpOpen: true, queryState: "answered", actionSuccess: true, hasGuidance: true }), "answered");
assert.equal(resolveBookyHelpState({ helpOpen: true, queryState: "ambiguous", actionSuccess: true, hasGuidance: true }), "ambiguous");
assert.equal(resolveBookyHelpState({ helpOpen: true, queryState: "noMatch", actionSuccess: true, hasGuidance: true }), "noMatch");

assert.equal(BOOKY_HELP_PRESENTATIONS.idle.message, "質問O.Kにゃん！");
assert.equal(BOOKY_HELP_PRESENTATIONS.answered.message, "ここからできるにゃん！");
assert.equal(BOOKY_HELP_PRESENTATIONS.ambiguous.message, "どっちのことかにゃ？");
assert.equal(BOOKY_HELP_PRESENTATIONS.guidance.message, "ここ、ちょっと確認してみるにゃん");
assert.equal(BOOKY_HELP_PRESENTATIONS.success.message, "できたにゃん！");
assert.equal(BOOKY_HELP_PRESENTATIONS.noMatch.message, "こんな聞き方を試してみてにゃん");

async function verifyAssetsAndIntegration() {
  const assetNames = ["idle", "answered", "ambiguous", "guidance", "success"] as const;
  const hashes = new Set<string>();
  let totalBytes = 0;
  for (const state of assetNames) {
    const publicPath = BOOKY_HELP_PRESENTATIONS[state].imageSrc;
    const absolutePath = path.resolve("public", publicPath.replace(/^\//u, ""));
    const [buffer, metadata, fileStat] = await Promise.all([
      readFile(absolutePath),
      sharp(absolutePath).metadata(),
      stat(absolutePath),
    ]);
    assert.equal(metadata.format, "webp", `${state} must be WebP`);
    assert.equal(metadata.width, 256, `${state} width`);
    assert.equal(metadata.height, 256, `${state} height`);
    assert.equal(metadata.hasAlpha, true, `${state} must preserve transparency`);
    assert.ok(fileStat.size <= 80 * 1024, `${state} asset is too large: ${fileStat.size}`);
    hashes.add(createHash("sha256").update(buffer).digest("hex"));
    totalBytes += fileStat.size;
  }
  assert.equal(hashes.size, assetNames.length, "Booky state assets must not be duplicates");

  const [bookySource, panelSource, editorSource] = await Promise.all([
    readFile(path.resolve("src/lib/editorGuidance/bookyHelp.ts"), "utf8"),
    readFile(path.resolve("src/components/EditorHelpPanel.tsx"), "utf8"),
    readFile(path.resolve("src/components/DashboardBookEditor.tsx"), "utf8"),
  ]);
  const bookyImplementation = `${bookySource}\n${panelSource}`;
  assert.equal(/\bfetch\s*\(|trackEvent\s*\(|localStorage|sessionStorage/iu.test(bookyImplementation), false, "Booky Help must stay client-only without persistence or analytics");
  assert.ok(panelSource.includes("onBookyStateChange"), "existing Help Panel must expose matcher-derived Booky state");
  assert.ok(panelSource.includes("searchRef.current?.focus()"), "Help search focus must remain intact");
  assert.ok(editorSource.includes("helpTriggerRef.current?.focus()"), "Help close must return focus to Booky trigger");
  assert.ok(editorSource.includes("result === \"handled\""), "handled Help actions must trigger success state");
  assert.equal(editorSource.includes("<CharacterAssistant"), false, "Editor must not render a second character assistant");
  assert.equal(EDITOR_HELP_CATALOG.length, 42, "Help Catalog must remain unchanged");

  console.log(`Booky Help verification passed: ${assetNames.length} states, ${totalBytes} bytes, 42 Help intents unchanged.`);
}

void verifyAssetsAndIntegration();
