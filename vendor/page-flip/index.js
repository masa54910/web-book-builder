"use strict";

// WebBookMaker's managed page-flip fork keeps the upstream 2.0.7 renderer and
// adds an explicit physical right-bound adapter. The adapter is intentionally
// opt-in; horizontal/LTR callers continue to use the upstream methods.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pageFlip = require("./dist/js/page-flip.browser.js");

const FLIP_BACK = 1;
const STATE_READ = "read";
const LEFT_BOUND = "left-bound";
const RIGHT_BOUND = "right-bound";

function normalizeBindingMode(settings) {
  return settings && settings.bookBindingMode === RIGHT_BOUND ? RIGHT_BOUND : LEFT_BOUND;
}

function installRightBoundLayout(app) {
  const collection = app.getPageCollection();
  if (!collection || collection.__wbRightBoundLayoutInstalled) return;

  const render = app.getRender();
  collection.__wbRightBoundLayoutInstalled = true;
  const pageCount = collection.getPageCount();
  const rightBoundSpreads = pageCount ? [[0]] : [];
  for (let first = 1; first < pageCount; first += 2) {
    rightBoundSpreads.push(first + 1 < pageCount ? [first, first + 1] : [first]);
  }
  collection.__wbRightBoundSpreads = rightBoundSpreads;
  collection.getSpread = function getRightBoundSpreads() {
    return this.__wbRightBoundSpreads;
  };
  collection.getSpreadIndexByPage = function getRightBoundSpreadIndex(pageIndex) {
    if (!Number.isInteger(pageIndex) || pageIndex < 0 || pageIndex >= pageCount) return null;
    return this.__wbRightBoundSpreads.findIndex((spread) => spread.includes(pageIndex));
  };

  // The upstream portrait renderer always places the current page on the
  // right. Right-bound books need an actual physical spread instead: the
  // canonical lower page index is on the right and the adjacent page is on
  // the left. This changes only the renderer's side assignment; page arrays
  // and page identities remain canonical.
  collection.showSpread = function showRightBoundSpread() {
    const spread = this.getSpread()[this.getCurrentSpreadIndex()];
    if (!spread) return;
    const pages = this.getPages();
    if (spread.length === 2) {
      render.setLeftPage(pages[spread[1]]);
      render.setRightPage(pages[spread[0]]);
    } else if (spread[0] === 0) {
      // A right-bound book is closed on the viewer's left. The cover's
      // trailing edge becomes the spine at the centered root midpoint.
      render.setLeftPage(pages[spread[0]]);
      render.setRightPage(null);
    } else {
      // A trailing singleton is the back cover on the viewer's left.
      render.setLeftPage(pages[spread[0]]);
      render.setRightPage(null);
    }
    this.currentPageIndex = spread[0];
    app.updatePageIndex(this.currentPageIndex);
  };
}

function installRightBoundMethods(app) {
  installRightBoundLayout(app);
  const controller = app.getFlipController();
  if (controller.__wbRightBoundAdapterInstalled) return controller;

  const collection = app.getPageCollection();
  const originalFlipNext = controller.flipNext;
  const originalFlipPrev = controller.flipPrev;
  const originalTurnNext = app.turnToNextPage;
  const originalTurnPrev = app.turnToPrevPage;
  const getActiveCollection = () => app.getPageCollection();

  // Keep page-flip's pointer normalization, corner selection, clipping and
  // animation intact. Only its binding-specific page mapping is replaced.
  collection.getFlippingPage = function getRightBoundFlippingPage(direction) {
    const spread = this.getSpread()[this.getCurrentSpreadIndex()];
    if (!spread) return null;
    const pageIndex = direction === FLIP_BACK
      ? (spread[1] ?? spread[0])
      : spread[0];
    const page = this.getPage(pageIndex);
    page?.setOrientation(direction === FLIP_BACK ? 0 : 1);
    return page;
  };
  collection.getBottomPage = function getRightBoundBottomPage(direction) {
    const spreadIndex = this.getCurrentSpreadIndex();
    const targetIndex = direction === FLIP_BACK ? spreadIndex + 1 : spreadIndex - 1;
    const target = this.getSpread()[targetIndex];
    if (!target) return null;
    const pageIndex = direction === FLIP_BACK
      ? (targetIndex === 1 ? target[0] : (target[1] ?? target[0]))
      : target[0];
    const page = this.getPage(pageIndex);
    page?.setOrientation(direction === FLIP_BACK && targetIndex === 1 ? 1 : 0);
    return page;
  };
  controller.checkDirection = function checkRightBoundDirection(direction) {
    const activeCollection = getActiveCollection();
    const spreadIndex = activeCollection.getCurrentSpreadIndex();
    const lastSpreadIndex = activeCollection.getSpread().length - 1;
    return direction === FLIP_BACK
      ? spreadIndex < lastSpreadIndex
      : spreadIndex > 0;
  };

  // Upstream direction 1 is the physical left-to-right turn used for Right-
  // bound Next. Its completion callback calls turnToPrevPage, so swap only
  // the logical completion methods; page order and IDs remain canonical.
  app.turnToPrevPage = function rightBoundPhysicalNextCompletion() {
    return originalTurnNext.call(app);
  };
  app.turnToNextPage = function rightBoundPhysicalPreviousCompletion() {
    return originalTurnPrev.call(app);
  };

  controller.flipRightBoundNext = function flipRightBoundNext(corner = "top") {
    if (controller.getState() !== STATE_READ) return;
    originalFlipPrev.call(controller, corner);
  };
  controller.flipRightBoundPrevious = function flipRightBoundPrevious(corner = "top") {
    if (controller.getState() !== STATE_READ) return;
    originalFlipNext.call(controller, corner);
  };

  controller.__wbRightBoundAdapterInstalled = true;
  return controller;
}

const PageFlip = pageFlip.PageFlip;
const originalLoadFromHTML = PageFlip.prototype.loadFromHTML;
const originalLoadFromImages = PageFlip.prototype.loadFromImages;
const originalUpdateFromHTML = PageFlip.prototype.updateFromHtml;
const originalUpdateFromImages = PageFlip.prototype.updateFromImages;
const originalGetFlipController = PageFlip.prototype.getFlipController;
const originalFlipNext = PageFlip.prototype.flipNext;
const originalFlipPrev = PageFlip.prototype.flipPrev;
const originalUserMove = PageFlip.prototype.userMove;
const originalUserStop = PageFlip.prototype.userStop;

function initializeBindingMode(instance) {
  // This runs before upstream loadFrom* calls pages.show(startPage), so the
  // first cover state and the first turn share the same explicit mode.
  instance.__wbPhysicalBinding = normalizeBindingMode(instance.getSettings?.());
}

PageFlip.prototype.loadFromHTML = function (items) {
  initializeBindingMode(this);
  const result = originalLoadFromHTML.call(this, items);
  if (this.__wbPhysicalBinding === RIGHT_BOUND) {
    installRightBoundLayout(this);
    installRightBoundMethods(this);
    this.getPageCollection().show(this.getCurrentPageIndex());
  }
  return result;
};
PageFlip.prototype.loadFromImages = function (images) {
  initializeBindingMode(this);
  const result = originalLoadFromImages.call(this, images);
  if (this.__wbPhysicalBinding === RIGHT_BOUND) {
    installRightBoundLayout(this);
    installRightBoundMethods(this);
    this.getPageCollection().show(this.getCurrentPageIndex());
  }
  return result;
};
PageFlip.prototype.updateFromHtml = function (items) {
  const currentPageIndex = this.getCurrentPageIndex();
  const result = originalUpdateFromHTML.call(this, items);
  if (this.__wbPhysicalBinding === RIGHT_BOUND) {
    installRightBoundLayout(this);
    installRightBoundMethods(this);
    this.getPageCollection().show(currentPageIndex);
  }
  return result;
};
PageFlip.prototype.updateFromImages = function (images) {
  const currentPageIndex = this.getCurrentPageIndex();
  const result = originalUpdateFromImages.call(this, images);
  if (this.__wbPhysicalBinding === RIGHT_BOUND) {
    installRightBoundLayout(this);
    installRightBoundMethods(this);
    this.getPageCollection().show(currentPageIndex);
  }
  return result;
};
PageFlip.prototype.getBookBindingMode = function () {
  return this.__wbPhysicalBinding || LEFT_BOUND;
};

PageFlip.prototype.setPhysicalBinding = function (binding) {
  this.__wbPhysicalBinding = binding === RIGHT_BOUND ? RIGHT_BOUND : LEFT_BOUND;
};
PageFlip.prototype.flipRightBoundNext = function (corner = "top") {
  installRightBoundMethods(this);
  return this.getFlipController().flipRightBoundNext(corner);
};
PageFlip.prototype.flipRightBoundPrevious = function (corner = "top") {
  installRightBoundMethods(this);
  return this.getFlipController().flipRightBoundPrevious(corner);
};
PageFlip.prototype.flipNext = function (corner = "top") {
  if (this.__wbPhysicalBinding === "right-bound") return this.flipRightBoundPrevious(corner);
  return originalFlipNext.call(this, corner);
};
PageFlip.prototype.flipPrev = function (corner = "top") {
  if (this.__wbPhysicalBinding === "right-bound") return this.flipRightBoundNext(corner);
  return originalFlipPrev.call(this, corner);
};
PageFlip.prototype.userMove = function (pos, isTouch) {
  if (this.__wbPhysicalBinding === RIGHT_BOUND) installRightBoundMethods(this);
  return originalUserMove.call(this, pos, isTouch);
};
PageFlip.prototype.userStop = function (pos, isSwipe = false) {
  if (this.__wbPhysicalBinding !== RIGHT_BOUND || isSwipe) {
    if (this.__wbPhysicalBinding === RIGHT_BOUND) installRightBoundMethods(this);
    return originalUserStop.call(this, pos, isSwipe);
  }

  // Keep the upstream drag/corner geometry when a fold calculation already
  // exists. A plain canvas click, however, must enter the same right-bound
  // logical mapping as the buttons and keyboard; upstream `flip(pos)` is
  // LTR-oriented and rejects a right-side click on the initial cover.
  if (!this.isUserTouch) return;
  const controller = this.getFlipController();
  const wasMoved = this.isUserMove;
  this.isUserTouch = false;
  if (wasMoved && controller.getCalculation?.()) {
    this.isUserMove = false;
    return controller.stopMove();
  }

  this.isUserMove = false;
  const collection = this.getPageCollection();
  const spreads = collection.getSpread();
  const spreadIndex = collection.getCurrentSpreadIndex();
  const lastSpreadIndex = Math.max(0, spreads.length - 1);
  const rect = this.getBoundsRect();
  const corner = pos.y < rect.height / 2 ? "top" : "bottom";
  const logicalNext = spreadIndex === 0
    ? true
    : spreadIndex >= lastSpreadIndex
      ? false
      : pos.x <= rect.width / 2;
  return logicalNext
    ? this.flipRightBoundNext(corner)
    : this.flipRightBoundPrevious(corner);
};
PageFlip.prototype.getFlipController = function () {
  return originalGetFlipController.call(this);
};

module.exports = pageFlip;
