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
assert.match(pageFlipFork, /originalFlipPrev/);
assert.match(pageFlipFork, /originalFlipNext/);
assert.match(pageFlipFork, /PageFlip\.prototype\.userStop/);
assert.match(pageFlipFork, /originalUserMove\.call\(this, pos, isTouch\)/);
assert.match(pageFlipFork, /originalUserStop\.call\(this, pos, isSwipe\)/);
assert.match(pageFlipFork, /this\.flipRightBoundNext\(corner\)/);
assert.match(pageFlipFork, /this\.flipRightBoundPrevious\(corner\)/);
assert.match(pageFlipFork, /installRightBoundLayout/);
assert.match(pageFlipFork, /collection\.showSpread = function showRightBoundSpread/);
assert.match(pageFlipFork, /render\.setLeftPage\(pages\[spread\[1\]\]\)/);
assert.match(pageFlipFork, /render\.setRightPage\(pages\[spread\[0\]\]\)/);
assert.match(pageFlipFork, /render\.setLeftPage\(pages\[spread\[0\]\]\);\s*render\.setRightPage\(null\)/);
assert.match(pageFlipFork, /const logicalNext = spreadIndex === 0/);
assert.match(pageFlipFork, /this\.flipRightBoundNext\(corner\)/);
assert.match(pageFlipFork, /controller\.getCalculation\?\.\(\)/);
assert.match(pageFlipFork, /originalUserStop\.call\(this, pos, isSwipe\)/);
assert.match(pageFlipFork, /findIndex\(\(spread\) => spread\.includes\(pageIndex\)\)/);
assert.match(pageFlipFork, /direction === FLIP_BACK \? spreadIndex \+ 1 : spreadIndex - 1/);
assert.match(pageFlipFork, /checkRightBoundDirection/);
assert.match(pageFlipFork, /rightBoundPhysicalNextCompletion/);
assert.match(pageFlipFork, /rightBoundPhysicalPreviousCompletion/);
assert.doesNotMatch(pageFlipFork, /userStop[\s\S]{0,240}flipRightBoundNext\("top"\)/);
assert.doesNotMatch(pageFlipFork, /userStop[\s\S]{0,240}flipRightBoundPrevious\("top"\)/);
assert.doesNotMatch(globalStyles, /translateX\(-25%\)/);
assert.doesNotMatch(globalStyles, /data-book-edge="cover"\]\s*\{\s*justify-items:\s*start/);
assert.match(globalStyles, /sample-book-viewport \.flip-book::after[\s\S]*left: -13px/);
assert.match(globalStyles, /\.reader-writing-vertical-rl \.contents-page[\s\S]*writing-mode: vertical-rl/);
assert.match(globalStyles, /\.reader-writing-vertical-rl \.contents-list[\s\S]*flex-direction: row-reverse/);
assert.match(globalStyles, /\.reader-writing-vertical-rl \.contents-link[\s\S]*writing-mode: vertical-rl/);
assert.match(readerSource, /const backCoverVisible =/);
assert.match(readerSource, /atEnd=\{backCoverVisible \|\| activePageIndex >= pagesWithAdjustments\.length - 1\}/);

const rightBoundSpreads = (pageCount: number) => [
  [0],
  ...Array.from({ length: Math.ceil(Math.max(0, pageCount - 1) / 2) }, (_, index) => {
    const first = index * 2 + 1;
    return first + 1 < pageCount ? [first, first + 1] : [first];
  }),
];
for (const pageCount of [1, 2, 3, 4, 5, 6]) {
  const spreads = rightBoundSpreads(pageCount);
  assert.equal(spreads[0][0], 0, "front cover remains canonical page 0");
  assert.equal(spreads.at(-1)?.at(-1), pageCount - 1, "back cover remains the final canonical page");
  assert.deepEqual(spreads.flat(), Array.from({ length: pageCount }, (_, index) => index));
  assert.equal(spreads.length - 1, spreads.findIndex((spread) => spread.includes(pageCount - 1)));
}

console.log("Gate36 RTL/vertical writing invariants passed.");
