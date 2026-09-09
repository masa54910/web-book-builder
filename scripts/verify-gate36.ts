import assert from "node:assert/strict";
import { DEFAULT_BOOK_DESIGN_SPEC, designSpecFromBookConfig, parseBookDesignSpec } from "../src/lib/designSpec";
import { toBoundPageOrder } from "../src/lib/paginateText";
import { physicalFlipMethod, verticalSwipeDirection } from "../src/lib/readerNavigation";

const pages = [{ id: "p0" }, { id: "p1" }, { id: "p2" }] as never[];
assert.deepEqual(toBoundPageOrder(pages, false, "rtl").map((page) => page.id), ["p0", "p1", "p2"]);
assert.deepEqual(toBoundPageOrder(pages, false, "ltr").map((page) => page.id), ["p0", "p1", "p2"]);

const vertical = parseBookDesignSpec({
  ...DEFAULT_BOOK_DESIGN_SPEC,
  page: { ...DEFAULT_BOOK_DESIGN_SPEC.page, writingMode: "vertical-rl", bindingDirection: "rtl" },
});
assert.equal(vertical.success, true);
assert.equal(parseBookDesignSpec({ ...DEFAULT_BOOK_DESIGN_SPEC, page: { ...DEFAULT_BOOK_DESIGN_SPEC.page, writingMode: "vertical-rl", bindingDirection: "ltr" } }).success, false);
assert.equal(parseBookDesignSpec({ ...DEFAULT_BOOK_DESIGN_SPEC, page: { ...DEFAULT_BOOK_DESIGN_SPEC.page, writingMode: "invalid" } }).success, false);
assert.equal(designSpecFromBookConfig({ writingMode: "vertical-rl", bindingDirection: "ltr" }).page.bindingDirection, "rtl");
assert.equal(physicalFlipMethod("vertical-rl", "next"), "flipPrev");
assert.equal(physicalFlipMethod("vertical-rl", "previous"), "flipNext");
assert.equal(physicalFlipMethod("horizontal-tb", "next"), "flipNext");
assert.equal(verticalSwipeDirection(80), "next");
assert.equal(verticalSwipeDirection(-80), "previous");

console.log("Gate36 RTL/vertical writing invariants passed.");
