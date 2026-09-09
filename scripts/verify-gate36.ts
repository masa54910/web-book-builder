import assert from "node:assert/strict";
import fs from "node:fs";
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

const pageFlipFork = fs.readFileSync(new URL("../vendor/page-flip/index.js", import.meta.url), "utf8");
const readerSource = fs.readFileSync(new URL("../src/components/BookReader.tsx", import.meta.url), "utf8");
assert.match(readerSource, /bookBindingMode: config\.writingMode === "vertical-rl" \? "right-bound" : "left-bound"/);
assert.doesNotMatch(readerSource, /pages\.reverse\(\)/);
assert.match(pageFlipFork, /setPhysicalBinding/);
assert.match(pageFlipFork, /bookBindingMode/);
assert.match(pageFlipFork, /initializeBindingMode/);
assert.match(pageFlipFork, /PageFlip\.prototype\.loadFromHTML/);
assert.match(pageFlipFork, /PageFlip\.prototype\.getBookBindingMode/);
assert.match(pageFlipFork, /flipRightBoundNext/);
assert.match(pageFlipFork, /flipRightBoundPrevious/);
assert.match(pageFlipFork, /x: -rect\.pageWidth \+ margin/);
assert.match(pageFlipFork, /x: rect\.pageWidth/);
assert.match(pageFlipFork, /x: rect\.pageWidth \* 2 - margin/);
assert.match(pageFlipFork, /x: -rect\.pageWidth/);
assert.match(pageFlipFork, /PageFlip\.prototype\.userStop/);
assert.match(pageFlipFork, /this\.flipRightBoundNext\("top"\)/);
assert.match(pageFlipFork, /this\.flipRightBoundPrevious\("top"\)/);
assert.match(pageFlipFork, /this\.flipRightBoundNext\(corner\)/);
assert.match(pageFlipFork, /this\.flipRightBoundPrevious\(corner\)/);

console.log("Gate36 RTL/vertical writing invariants passed.");
