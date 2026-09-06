import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { DEFAULT_BOOK_DESIGN_SPEC, designSpecFromBookConfig, parseBookDesignSpec } from "../src/lib/designSpec";
import { DESIGN_TOKEN_NAMES } from "../src/lib/designTokens";

const css = readFileSync(resolve(process.cwd(), "src/app/globals.css"), "utf8");
for (const token of DESIGN_TOKEN_NAMES) {
  assert.match(css, new RegExp(`${token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*:`), `missing CSS token ${token}`);
}

const parsed = parseBookDesignSpec(DEFAULT_BOOK_DESIGN_SPEC);
if (!parsed.success) throw new Error(parsed.error);
assert.equal(parsed.success, true);
assert.equal(parsed.data.page.bindingDirection, "rtl");
assert.equal(parsed.data.cover.layout, "layout-01");

const legacy = designSpecFromBookConfig({ theme: "classic", bindingDirection: "rtl", title: "legacy" });
assert.deepEqual(legacy.typography, DEFAULT_BOOK_DESIGN_SPEC.typography);
assert.equal(legacy.cover.layout, "layout-01");

const invalid = parseBookDesignSpec({
  ...DEFAULT_BOOK_DESIGN_SPEC,
  page: { ...DEFAULT_BOOK_DESIGN_SPEC.page, pageWidth: "--arbitrary-css" },
});
assert.equal(invalid.success, false);

const unsafe = parseBookDesignSpec({
  ...DEFAULT_BOOK_DESIGN_SPEC,
  cover: { ...DEFAULT_BOOK_DESIGN_SPEC.cover, titleTextOverride: "<style>body{display:none}</style>" },
});
assert.equal(unsafe.success, false);

const outOfRange = parseBookDesignSpec({
  ...DEFAULT_BOOK_DESIGN_SPEC,
  cover: { ...DEFAULT_BOOK_DESIGN_SPEC.cover, overlayOpacity: 2 },
});
assert.equal(outOfRange.success, false);

console.log(`Design system verification passed (${DESIGN_TOKEN_NAMES.length} semantic tokens).`);
