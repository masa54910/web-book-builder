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
const globalStyles = fs.readFileSync(new URL("../src/app/globals.css", import.meta.url), "utf8");
assert.match(readerSource, /bookBindingMode: isRightBound \? "right-bound" : "left-bound"/);
assert.match(readerSource, /usePortrait=\{!isRightBound\}/);
assert.match(readerSource, /data-book-edge=/);
assert.doesNotMatch(readerSource, /pages\.reverse\(\)/);
assert.match(pageFlipFork, /setPhysicalBinding/);
assert.match(pageFlipFork, /bookBindingMode/);
assert.match(pageFlipFork, /initializeBindingMode/);
assert.match(pageFlipFork, /PageFlip\.prototype\.loadFromHTML/);
assert.match(pageFlipFork, /PageFlip\.prototype\.getBookBindingMode/);
assert.match(pageFlipFork, /flipRightBoundNext/);
assert.match(pageFlipFork, /flipRightBoundPrevious/);
assert.match(pageFlipFork, /physicalFlip\.call\(controller, corner\)/);
assert.match(pageFlipFork, /originalFlipPrev/);
assert.match(pageFlipFork, /originalFlipNext/);
assert.match(pageFlipFork, /PageFlip\.prototype\.userStop/);
assert.match(pageFlipFork, /this\.flipRightBoundNext\("top"\)/);
assert.match(pageFlipFork, /this\.flipRightBoundPrevious\("top"\)/);
assert.match(pageFlipFork, /this\.flipRightBoundNext\(corner\)/);
assert.match(pageFlipFork, /this\.flipRightBoundPrevious\(corner\)/);
assert.match(pageFlipFork, /installRightBoundLayout/);
assert.match(pageFlipFork, /collection\.showSpread = function showRightBoundSpread/);
assert.match(pageFlipFork, /render\.setLeftPage\(pages\[spread\[1\]\]\)/);
assert.match(pageFlipFork, /render\.setRightPage\(pages\[spread\[0\]\]\)/);
assert.match(pageFlipFork, /const nextIndex = collection\.getCurrentSpreadIndex\(\) \+ 1/);
assert.match(pageFlipFork, /const previous = collection\.getSpread\(\)\[collection\.getCurrentSpreadIndex\(\) - 1\]/);
assert.match(globalStyles, /\.reader-binding-rtl \.book-viewport\[data-book-edge="cover"\]/);
assert.match(globalStyles, /transform: translateX\(-25%\)/);
assert.match(globalStyles, /sample-book-viewport \.flip-book::after[\s\S]*left: -13px/);

console.log("Gate36 RTL/vertical writing invariants passed.");
